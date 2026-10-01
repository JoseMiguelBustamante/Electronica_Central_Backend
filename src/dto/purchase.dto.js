import { z } from 'zod';

const uuidDto = z.string().uuid();
const positiveQuantityDto = z.coerce.number().finite().positive();
const nonnegativeCostDto = z.coerce.number().finite().nonnegative();
const idempotencyKeyDto = z.string().trim().min(1).max(255);

const purchaseDetailDto = z.object({
  idProducto: uuidDto,
  cantidad: positiveQuantityDto,
  costoUnitario: nonnegativeCostDto,
});

const assertUniqueProducts = (detalles, ctx) => {
  const seen = new Set();
  for (const [index, detail] of detalles.entries()) {
    if (seen.has(detail.idProducto)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate idProducto in detalles',
        path: ['detalles', index, 'idProducto'],
      });
    }
    seen.add(detail.idProducto);
  }
};

export const purchaseIdParamsDto = z.object({
  id: uuidDto,
});

export const listPurchasesQueryDto = z.object({
  estado: z.enum(['PENDIENTE', 'RECIBIDA', 'CANCELADA']).optional(),
  idProveedor: uuidDto.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const createPurchaseDto = z.object({
  idProveedor: uuidDto,
  fecha: z.coerce.date().optional(),
  detalles: z.array(purchaseDetailDto).min(1),
}).superRefine((data, ctx) => assertUniqueProducts(data.detalles, ctx));

export const updatePurchaseDto = z.object({
  idProveedor: uuidDto,
  fecha: z.coerce.date().optional(),
  detalles: z.array(purchaseDetailDto).min(1),
}).superRefine((data, ctx) => assertUniqueProducts(data.detalles, ctx));

export const receivePurchaseDto = z.object({
  claveIdempotencia: idempotencyKeyDto,
});
