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

/** Admin creates employees (staff). Clients self-register via /api/auth/registro. */
export const createUserDto = z.object({
  nombreUsuario: z.string().trim().min(3).max(120),
  correo: z.string().trim().email().max(254),
  contrasena: passwordPolicySchema,
  roles: z.array(z.enum(['VENDEDOR'])).min(1),
});

export const listLogDto = z.object({});
