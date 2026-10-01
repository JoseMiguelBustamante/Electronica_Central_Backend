import { z } from 'zod';

const uuidDto = z.string().uuid();
const optionalContactDto = z.string().trim().max(120).optional().nullable();

export const supplierIdParamsDto = z.object({
  id: uuidDto,
});

export const listSuppliersQueryDto = z.object({
  buscar: z.string().trim().min(1).max(120).optional(),
  activo: z.coerce.boolean().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export const createSupplierDto = z.object({
  razonSocial: z.string().trim().min(1).max(120),
  documento: z.string().trim().min(1).max(120).optional().nullable(),
  telefono: optionalContactDto,
  correo: z.string().trim().email().max(254).optional().nullable(),
  direccion: z.string().trim().max(300).optional().nullable(),
});

export const updateSupplierDto = z.object({
  razonSocial: z.string().trim().min(1).max(120).optional(),
  documento: z.string().trim().min(1).max(120).optional().nullable(),
  telefono: optionalContactDto,
  correo: z.string().trim().email().max(254).optional().nullable(),
  direccion: z.string().trim().max(300).optional().nullable(),
  activo: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});
