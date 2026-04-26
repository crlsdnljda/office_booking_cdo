import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../shared/prisma.js';
import { env } from '../../shared/env.js';
import type { Session } from '../../shared/auth.js';

const loginSchema = z.object({ pin: z.string().min(1) });

export const authRoutes = async (app: FastifyInstance) => {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' });
    const { pin } = parsed.data;

    if (pin === env.ADMIN_PIN) {
      const session: Session = { role: 'admin' };
      const token = app.jwt.sign(session);
      return { token, role: 'admin' as const };
    }

    const user = await prisma.user.findUnique({ where: { pin } });
    if (!user) return reply.code(401).send({ error: 'invalid_pin' });

    const session: Session = { role: 'user', userId: user.id, alias: user.alias };
    const token = app.jwt.sign(session);
    return {
      token,
      role: 'user' as const,
      user: { id: user.id, alias: user.alias },
    };
  });

  app.get('/auth/me', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const session = req.user as Session;
    if (session.role === 'admin') return { role: 'admin' as const };
    if (!session.userId) return reply.code(401).send({ error: 'unauthorized' });
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, alias: true },
    });
    if (!user) return reply.code(401).send({ error: 'user_deleted' });
    return { role: 'user' as const, user };
  });
};
