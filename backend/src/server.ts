import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './shared/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { reservationsRoutes } from './modules/reservations/reservations.routes.js';
import { startScheduler } from './modules/notifications/scheduler.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, { secret: env.JWT_SECRET });

app.get('/health', async () => ({ ok: true }));

await app.register(authRoutes, { prefix: '/api' });
await app.register(usersRoutes, { prefix: '/api' });
await app.register(reservationsRoutes, { prefix: '/api' });

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    startScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
