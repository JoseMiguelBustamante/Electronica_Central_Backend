import { z } from 'zod';

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
  contrasenaTemporal: z.string().min(12).max(128),
});

export const createUserDto = z.object({
  nombreUsuario: z.string().trim().min(3).max(120),
  correo: z.string().trim().email().max(254),
  contrasena: z.string().min(12).max(128),
  roles: z.array(z.enum(['VENDEDOR', 'CLIENTE'])).min(1),
});

export const listLogDto = z.object({});
