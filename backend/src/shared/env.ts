import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  ADMIN_PIN: z.string().min(1),
  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),
  EVOLUTION_GROUP_JID: z.string().optional(),
  TZ: z.string().default('Europe/Madrid'),
});

export const env = envSchema.parse(process.env);
