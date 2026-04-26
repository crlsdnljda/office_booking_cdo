import type { FastifyReply, FastifyRequest } from 'fastify';

export type SessionRole = 'admin' | 'user';

export type Session = {
  role: SessionRole;
  userId?: string;
  alias?: string;
};

export const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
};

export const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
    const session = req.user as Session;
    if (session.role !== 'admin') return reply.code(403).send({ error: 'forbidden' });
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
};

export const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
    const session = req.user as Session;
    if (session.role !== 'user') return reply.code(403).send({ error: 'forbidden' });
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
};
