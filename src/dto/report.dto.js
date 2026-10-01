import { z } from 'zod';

const dateDto = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuidDto = z.string().uuid();

export const reportPeriodQueryDto = z.object({
  desde: dateDto,
  hasta: dateDto,
  formato: z.enum(['json', 'xlsx', 'pdf']).default('json'),
});

export const reportVentasQueryDto = reportPeriodQueryDto.extend({
  idUsuario: uuidDto.optional(),
  estado: z.enum(['BORRADOR', 'CONFIRMADA', 'ANULADA']).optional(),
});

export const reportInventarioQueryDto = z.object({
  fechaCorte: dateDto,
  formato: z.enum(['json', 'xlsx', 'pdf']).default('json'),
});
