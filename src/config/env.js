import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_SSL: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  /** One origin, or comma-separated list (e.g. public IP + Dokploy sslip host). */
  FRONTEND_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten());
  throw new Error('Invalid environment configuration');
}

export const env = {
  ...parsed.data,
  /** Allowed browser origins for CORS. */
  FRONTEND_ORIGINS: parsed.data.FRONTEND_ORIGIN,
  /** Primary origin (first entry) for links / redirects. */
  FRONTEND_ORIGIN: parsed.data.FRONTEND_ORIGIN[0],
};
