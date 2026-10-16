import { z } from 'zod';
import { passwordPolicySchema } from '../utils/passwordPolicy.js';

export const userIdDto = z.object({
  id: z.string().uuid(),
});

export const createClientDto = z.object({
  nombre: z.string().trim().min(1).max(120),
  documento: z.string().trim().max(120).optional(),
  telefono: z.string().trim().max(120).optional(),
  correo: z.string().trim().email().max(254).optional(),
});

export const resetUserDto = z.object({
  contrasenaTemporal: passwordPolicySchema,
});

const staffRolesDto = z.array(z.enum(['ADMINISTRADOR', 'VENDEDOR'])).min(1);

/** Admin creates employees (staff). Clients self-register via /api/auth/registro. */
export const createUserDto = z.object({
  nombreUsuario: z.string().trim().min(3).max(120),
  correo: z.string().trim().email().max(254),
  contrasena: passwordPolicySchema,
  roles: staffRolesDto,
});

export const updateUserDto = z.object({
  nombreUsuario: z.string().trim().min(3).max(120).optional(),
  correo: z.string().trim().email().max(254).optional(),
  activo: z.boolean().optional(),
  roles: staffRolesDto.optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const dateDto = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalTextDto = z.string().trim().min(1).max(120).optional();

export const listLogDto = z.object({
  desde: dateDto.optional(),
  hasta: dateDto.optional(),
  usuario: optionalTextDto,
  accion: optionalTextDto,
  tabla: optionalTextDto,
  limite: z.coerce.number().int().positive().max(2000).default(500),
});
