import { ReservationType, Room } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { evolutionApi } from '../../shared/evolution-api.js';

const ROOM_LABEL: Record<Room, string> = {
  SALA_ESTAR: 'Sala de estar',
  SALA_ORDENADORES: 'Sala de ordenadores',
};

const formatTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

const tick = async () => {
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60_000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

  // 1) 15-min warnings
  const ending = await prisma.reservation.findMany({
    where: {
      endAt: { gt: now, lte: in15 },
      releasedEarlyAt: null,
      endNotifiedAt: null,
    },
    include: { user: { select: { alias: true } } },
  });
  for (const r of ending) {
    const target =
      r.type === ReservationType.TOTAL ? 'toda la oficina' : ROOM_LABEL[r.room];
    const msg =
      `⏰ *Aviso de fin de reserva*\n\n` +
      `@${r.user.alias}, quedan *15 minutos* en *${target}*.\n` +
      `Termina a las *${formatTime(r.endAt)}*.`;
    await evolutionApi.sendToGroup(msg);
    await prisma.reservation.update({
      where: { id: r.id },
      data: { endNotifiedAt: now },
    });
  }

  // 2) Reservation just started (within last hour, not yet notified)
  const justStarted = await prisma.reservation.findMany({
    where: {
      startAt: { lte: now, gt: oneHourAgo },
      startedNotifiedAt: null,
    },
    include: { user: { select: { alias: true } } },
  });
  for (const r of justStarted) {
    const target =
      r.type === ReservationType.TOTAL ? 'toda la oficina' : ROOM_LABEL[r.room];
    const msg =
      `▶️ *Reserva iniciada*\n\n` +
      `@${r.user.alias} ha comenzado su reserva de *${target}*.\n` +
      `Termina a las *${formatTime(r.endAt)}*.`;
    await evolutionApi.sendToGroup(msg);
    await prisma.reservation.update({
      where: { id: r.id },
      data: { startedNotifiedAt: now },
    });
  }

  // 3) Reservation just ended naturally (endAt within last hour, not released early, not yet notified)
  const justEnded = await prisma.reservation.findMany({
    where: {
      endAt: { lte: now, gt: oneHourAgo },
      releasedEarlyAt: null,
      naturalEndNotifiedAt: null,
    },
    include: { user: { select: { alias: true } } },
  });
  for (const r of justEnded) {
    const target =
      r.type === ReservationType.TOTAL ? 'toda la oficina' : ROOM_LABEL[r.room];
    const msg =
      `✅ *Reserva terminada*\n\n` +
      `Ha terminado la reserva de *${target}* de @${r.user.alias}. La sala ya esta disponible.`;
    await evolutionApi.sendToGroup(msg);
    await prisma.reservation.update({
      where: { id: r.id },
      data: { naturalEndNotifiedAt: now },
    });
  }

};

export const startScheduler = () => {
  setInterval(() => {
    tick().catch((err) => console.error('[scheduler] tick failed', err));
  }, 60_000);
  tick().catch((err) => console.error('[scheduler] initial tick failed', err));
};
