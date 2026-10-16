import { z } from 'zod';
import { passwordPolicySchema } from '../utils/passwordPolicy.js';

export const registerAuthDto = z.object({
  nombreUsuario: z.string().trim().min(3).max(120),
  correo: z.string().trim().email().max(254),
  contrasena: passwordPolicySchema,
  nombre: z.string().trim().min(1).max(120),
  telefono: z.string().trim().max(120).optional(),
});

export const loginAuthDto = z.object({
  identificador: z.string().trim().min(1).max(254),
  contrasena: z.string().min(1).max(128),
});

export const changePasswordAuthDto = z.object({
  contrasenaActual: z.string().min(1).max(128),
  contrasenaNueva: passwordPolicySchema,
});

export const recoverPasswordDto = z.object({
  correo: z.string().trim().email().max(254),
});

export const resetPasswordWithTokenDto = z.object({
  token: z.string().trim().min(20).max(200),
  contrasenaNueva: passwordPolicySchema,
});
