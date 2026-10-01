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

export const confirmPaymentDto = z.object({
  claveIdempotencia: idempotencyKeyDto,
});
