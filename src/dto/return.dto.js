import { z } from 'zod';

const uuidDto = z.string().uuid();
const qtyDto = z.coerce.number().finite().positive();

export const listReturnsQueryDto = z.object({
  idVenta: uuidDto.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const returnIdParamsDto = z.object({
  id: uuidDto,
});

export const createReturnDto = z.object({
  idVenta: uuidDto,
  observacion: z.string().trim().max(2_000).optional(),
  detalles: z.array(z.object({
    idDetalleVenta: uuidDto,
    cantidad: qtyDto,
  })).min(1),
});
