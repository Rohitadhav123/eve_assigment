import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  PAYMENT_SUCCESS_RATE: z
    .string()
    .default('0.8')
    .transform((val) => parseFloat(val)),
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET is required'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(' Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables configuration.');
}

export const env = _env.data;
