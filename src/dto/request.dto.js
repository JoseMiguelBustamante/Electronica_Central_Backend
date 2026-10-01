import { z } from 'zod';

const uuidDto = z.string().uuid();

export const requestIdParamsDto = z.object({
  id: uuidDto,
});

export const listRequestsQueryDto = z.object({
  estado: z.enum(['PENDIENTE', 'ATENDIDA', 'CANCELADA']).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const createRequestDto = z.object({
  descripcionProducto: z.string().trim().min(1).max(4_000),
  cantidad: z.coerce.number().finite().positive(),
  observaciones: z.string().trim().max(4_000).optional().nullable(),
  idCliente: uuidDto.optional(),
  idProducto: uuidDto.optional().nullable(),
  idModelo: uuidDto.optional().nullable(),
});

export const updateRequestEstadoDto = z.object({
  estado: z.enum(['ATENDIDA', 'CANCELADA']),
});
