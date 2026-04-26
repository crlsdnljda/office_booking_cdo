import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Room, ReservationType } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { requireAuth, requireUser, type Session } from '../../shared/auth.js';
import { evolutionApi } from '../../shared/evolution-api.js';
import { cooldownEnd, effectiveEnd, overlaps } from './reservation.rules.js';

const ROOM_LABEL: Record<Room, string> = {
  SALA_ESTAR: 'Sala de estar',
  SALA_ORDENADORES: 'Sala de ordenadores',
};

const createSchema = z.object({
  room: z.nativeEnum(Room),
  type: z.nativeEnum(ReservationType),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

const isOnHourBoundary = (d: Date) =>
  d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

const formatDay = (d: Date) =>
  `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
const formatTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

export const reservationsRoutes = async (app: FastifyInstance) => {
  app.get('/reservations', { preHandler: requireAuth }, async (req) => {
    const q = (req.query as { from?: string; to?: string }) ?? {};
    const where =
      q.from && q.to
        ? { startAt: { lt: new Date(q.to) }, endAt: { gt: new Date(q.from) } }
        : {};
    const rows = await prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: { user: { select: { id: true, alias: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      room: r.room,
      type: r.type,
      startAt: r.startAt,
      endAt: r.endAt,
      releasedEarlyAt: r.releasedEarlyAt,
      user: r.user,
    }));
  });

  app.post('/reservations', { preHandler: requireUser }, async (req, reply) => {
    const session = req.user as Session;
    if (!session.userId) return reply.code(401).send({ error: 'unauthorized' });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);

    if (!isOnHourBoundary(startAt) || !isOnHourBoundary(endAt)) {
      return reply.code(400).send({ error: 'must_be_on_hour' });
    }
    if (endAt <= startAt) return reply.code(400).send({ error: 'end_before_start' });
    const durationHours = (endAt.getTime() - startAt.getTime()) / 3_600_000;
    if (durationHours < 1) return reply.code(400).send({ error: 'min_one_hour' });
    if (durationHours > 24) return reply.code(400).send({ error: 'max_24h' });
    if (startAt < new Date(Date.now() - 60_000))
      return reply.code(400).send({ error: 'cannot_reserve_in_past' });

    // 1 active/future reservation per user max
    const now = new Date();
    const userActive = await prisma.reservation.findFirst({
      where: {
        userId: session.userId,
        OR: [{ releasedEarlyAt: null, endAt: { gt: now } }],
      },
    });
    if (userActive) return reply.code(409).send({ error: 'already_have_active_reservation' });

    // Check conflicts in target room(s)
    const reservationsInWindow = await prisma.reservation.findMany({
      where: {
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    const isTotal = parsed.data.type === ReservationType.TOTAL;
    const conflicts = reservationsInWindow.filter((r) => {
      if (r.releasedEarlyAt && r.releasedEarlyAt <= startAt) return false;
      if (isTotal) return true;
      return r.type === ReservationType.TOTAL || r.room === parsed.data.room;
    });
    if (conflicts.length > 0) return reply.code(409).send({ error: 'slot_conflict' });

    // Cooldown check against this user's recent reservations
    const recent = await prisma.reservation.findMany({
      where: {
        userId: session.userId,
        startAt: { lte: startAt },
      },
      orderBy: { startAt: 'desc' },
      take: 20,
    });
    for (const r of recent) {
      const cdEnd = cooldownEnd(r);
      const cdStart = effectiveEnd(r);
      if (!overlaps(startAt, endAt, cdStart, cdEnd)) continue;
      const sameRoomCooldown = r.type === ReservationType.TOTAL || isTotal || r.room === parsed.data.room;
      if (sameRoomCooldown) return reply.code(409).send({ error: 'cooldown_active', cooldownEnd: cdEnd });
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId: session.userId,
        room: parsed.data.room,
        type: parsed.data.type,
        startAt,
        endAt,
      },
      include: { user: { select: { alias: true } } },
    });

    const target =
      reservation.type === ReservationType.TOTAL
        ? 'toda la oficina'
        : ROOM_LABEL[reservation.room];
    const msg =
      `✅ *Nueva reserva*\n\n` +
      `👤 @${reservation.user.alias}\n` +
      `📍 *${target}*\n` +
      `🗓️ ${formatDay(startAt)}\n` +
      `🕐 *${formatTime(startAt)}* – *${formatTime(endAt)}*`;
    void evolutionApi.sendToGroup(msg);

    return {
      id: reservation.id,
      room: reservation.room,
      type: reservation.type,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    };
  });

  app.delete('/reservations/:id', { preHandler: requireUser }, async (req, reply) => {
    const session = req.user as Session;
    const { id } = req.params as { id: string };
    const r = await prisma.reservation.findUnique({
      where: { id },
      include: { user: { select: { alias: true } } },
    });
    if (!r) return reply.code(404).send({ error: 'not_found' });
    if (r.userId !== session.userId) return reply.code(403).send({ error: 'forbidden' });
    if (new Date() >= r.startAt) return reply.code(409).send({ error: 'already_started' });

    await prisma.reservation.delete({ where: { id } });

    const target =
      r.type === ReservationType.TOTAL ? 'toda la oficina' : ROOM_LABEL[r.room];
    void evolutionApi.sendToGroup(
      `❌ *Reserva cancelada*\n\n` +
        `👤 @${r.user.alias}\n` +
        `📍 *${target}*\n` +
        `🗓️ ${formatDay(r.startAt)}\n` +
        `🕐 ${formatTime(r.startAt)} – ${formatTime(r.endAt)}`
    );

    return { ok: true };
  });

  app.post('/reservations/:id/release', { preHandler: requireUser }, async (req, reply) => {
    const session = req.user as Session;
    const { id } = req.params as { id: string };
    const r = await prisma.reservation.findUnique({
      where: { id },
      include: { user: { select: { alias: true } } },
    });
    if (!r) return reply.code(404).send({ error: 'not_found' });
    if (r.userId !== session.userId) return reply.code(403).send({ error: 'forbidden' });
    if (r.releasedEarlyAt) return reply.code(409).send({ error: 'already_released' });
    const now = new Date();
    if (now >= r.endAt) return reply.code(409).send({ error: 'already_ended' });

    const updated = await prisma.reservation.update({
      where: { id },
      data: { releasedEarlyAt: now < r.startAt ? r.startAt : now },
    });

    const target =
      r.type === ReservationType.TOTAL ? 'toda la oficina' : ROOM_LABEL[r.room];
    void evolutionApi.sendToGroup(
      `🔓 *Espacio liberado*\n\n` +
        `@${r.user.alias} ha liberado *${target}* antes de tiempo.\n` +
        `Disponible desde las *${formatTime(updated.releasedEarlyAt!)}*.`
    );

    return { ok: true, releasedEarlyAt: updated.releasedEarlyAt };
  });
};
