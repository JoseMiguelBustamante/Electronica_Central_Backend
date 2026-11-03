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
  /** Pasarela Stripe test (rama compañero). Vacío = cobro en línea deshabilitado (503). */
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_CURRENCY: z.string().trim().toLowerCase().length(3).default('bob'),
  STRIPE_CHECKOUT_EXPIRES_MINUTES: z.coerce.number().int().min(30).max(24 * 60).default(30),
  PAYMENT_SUCCESS_URL: z.string().url().default('http://localhost:5173/pagos/exito'),
  PAYMENT_CANCEL_URL: z.string().url().default('http://localhost:5173/pagos/cancelado'),
  /** SMTP connection URL, e.g. smtp://user:pass@smtp.example.com:587 */
  SMTP_URL: z.string().trim().optional().default(''),
  /** From header for transactional mail (recovery, etc.). */
  MAIL_FROM: z.string().trim().min(3).default('Electrónica Central AZ <noreply@localhost>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten());
  throw new Error('Invalid environment configuration');
}

export const env = {
  ...parsed.data,
  FRONTEND_ORIGINS: parsed.data.FRONTEND_ORIGIN,
  FRONTEND_ORIGIN: parsed.data.FRONTEND_ORIGIN[0],
  stripeConfigured: Boolean(parsed.data.STRIPE_SECRET_KEY?.startsWith('sk_')),
  smtpConfigured: Boolean(parsed.data.SMTP_URL),
};
