import { z } from 'zod';

// Validate real calendar dates, not just the YYYY-MM-DD shape.
const dateDto = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

export const reportVoiceContextDto = z.object({
  tipo: z.enum(['ventas', 'ganancias', 'inventario', 'rotacion']),
  desde: dateDto,
  hasta: dateDto,
  fechaCorte: dateDto.optional(),
});

export const reportVoiceBodyDto = z.object({
  texto: z.string().trim().min(3).max(500),
  contexto: reportVoiceContextDto.optional(),
});

export const reportVoiceResultDto = z.object({
  tipo: z.enum(['ventas', 'ganancias', 'inventario', 'rotacion']),
  desde: dateDto.optional(),
  hasta: dateDto.optional(),
  fechaCorte: dateDto.optional(),
  titulo: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  const required = value.tipo === 'inventario' ? ['fechaCorte'] : ['desde', 'hasta'];
  for (const field of required) {
    if (!value[field]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Fecha requerida' });
  }
});
