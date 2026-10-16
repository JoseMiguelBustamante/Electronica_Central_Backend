import { z } from 'zod';

/** Password: min 12 chars, at least one lowercase, uppercase and digit. */
export const passwordPolicySchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña es demasiado larga')
  .refine((value) => /[a-z]/.test(value), {
    message: 'La contraseña debe incluir al menos una minúscula',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'La contraseña debe incluir al menos una mayúscula',
  })
  .refine((value) => /\d/.test(value), {
    message: 'La contraseña debe incluir al menos un número',
  });

export const PASSWORD_POLICY_HINT =
  'Mínimo 12 caracteres, con minúscula, mayúscula y número.';

export const cumplePoliticaContrasena = (value) => passwordPolicySchema.safeParse(value).success;
