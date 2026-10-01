import { z } from 'zod';

const uuidDto = z.string().uuid();
const positiveQuantityDto = z.coerce.number().finite().positive();
const nonnegativeCostDto = z.coerce.number().finite().nonnegative();
const idempotencyKeyDto = z.string().trim().min(1).max(255);

export const inventoryProductoIdParamsDto = z.object({
  productoId: uuidDto,
});

export const listInventoryQueryDto = z.object({
  buscar: z.string().trim().min(1).max(120).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const listInventoryAlertsQueryDto = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const listInventoryMovementsQueryDto = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(50),
});

export const updateStockMinimoDto = z.object({
  stockMinimo: z.coerce.number().finite().nonnegative(),
}).strict();

export const createInventoryAdjustmentDto = z.object({
  idProducto: uuidDto,
  tipo: z.enum(['ENTRADA', 'SALIDA']),
  cantidad: positiveQuantityDto,
  motivo: z.string().trim().min(1).max(2_000),
  costoUnitario: nonnegativeCostDto.optional(),
  claveIdempotencia: idempotencyKeyDto,
}).superRefine((data, ctx) => {
  if (data.tipo === 'ENTRADA' && (data.costoUnitario === undefined || data.costoUnitario === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'costoUnitario is required for ENTRADA',
      path: ['costoUnitario'],
    });
  }
});

const previewItemDto = z.object({
  codigo: z.string().trim().min(1).max(120).optional(),
  idProducto: uuidDto.optional(),
  cantidad: z.coerce.number().finite().nonnegative(),
  precioExcel: z.coerce.number().finite().nonnegative().optional(),
}).refine((item) => Boolean(item.codigo || item.idProducto), {
  message: 'codigo or idProducto is required',
});

export const previewOpeningDto = z.object({
  items: z.array(previewItemDto).min(1),
});

export const confirmOpeningDto = z.object({
  claveIdempotencia: idempotencyKeyDto,
  items: z.array(z.object({
    idProducto: uuidDto,
    cantidad: z.coerce.number().finite().nonnegative(),
    costoUnitario: nonnegativeCostDto,
  })).min(1),
});
