import { z } from 'zod';

const uuidDto = z.string().uuid();
const idempotencyKeyDto = z.string().trim().min(1).max(255);

export const paymentIdParamsDto = z.object({
  id: uuidDto,
});

export const createPaymentDto = z.object({
  monto: z.coerce.number().finite().positive(),
  metodo: z.enum(['EFECTIVO', 'QR']),
  referenciaExterna: z.string().trim().min(1).max(200).optional().nullable(),
});

/** Cobro en línea: sin monto se cobra todo el saldo. URLs opcionales (si no, usa env). */
export const createOnlinePaymentDto = z.object({
  monto: z.coerce.number().finite().positive().optional(),
  successUrl: z.string().url().max(2000).optional(),
  cancelUrl: z.string().url().max(2000).optional(),
});

export const createStripeCartCheckoutDto = z.object({
  items: z.array(z.object({
    idProducto: uuidDto,
    cantidad: z.coerce.number().finite().positive(),
  })).min(1).max(50),
  successUrl: z.string().url().max(2000),
  cancelUrl: z.string().url().max(2000),
});

export const confirmPaymentDto = z.object({
  claveIdempotencia: idempotencyKeyDto,
});
