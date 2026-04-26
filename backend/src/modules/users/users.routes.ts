import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../shared/prisma.js';
import { requireAdmin } from '../../shared/auth.js';

const createUserSchema = z.object({
  alias: z.string().min(2).max(40),
  pin: z.string().min(4).max(20),
});

const updateUserSchema = createUserSchema.partial();

export const usersRoutes = async (app: FastifyInstance) => {
  app.get('/users', { preHandler: requireAdmin }, async () => {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, alias: true, pin: true, createdAt: true },
    });
  });

  app.post('/users', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });

    const { alias, pin } = parsed.data;
    const exists = await prisma.user.findFirst({ where: { OR: [{ alias }, { pin }] } });
    if (exists) {
      return reply.code(409).send({
        error: exists.alias === alias ? 'alias_taken' : 'pin_taken',
      });
    }
    const user = await prisma.user.create({
      data: { alias, pin },
      select: { id: true, alias: true, pin: true, createdAt: true },
    });
    return user;
  });

  app.patch('/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });

    const data = parsed.data;
    if (data.alias || data.pin) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.alias ? [{ alias: data.alias }] : []),
                ...(data.pin ? [{ pin: data.pin }] : []),
              ],
            },
          ],
        },
      });
      if (conflict) {
        return reply.code(409).send({
          error: conflict.alias === data.alias ? 'alias_taken' : 'pin_taken',
        });
      }
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, alias: true, pin: true, createdAt: true },
      });
      return user;
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.delete('/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await prisma.user.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });
};
