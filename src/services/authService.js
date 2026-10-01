import { errorCodes } from '../config/errorCodes.js';
import {
  createClientAccount,
  createSession,
  findSession,
  findUserById,
  findUserForLogin,
  revokeSession,
  setPasswordChangeRequired,
  touchSession,
  updatePassword,
} from '../repositories/authRepository.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createSessionToken, hashToken } from '../utils/token.js';

const safeUser = (user) => ({
  id: user.id_usuario,
  nombreUsuario: user.nombre_usuario,
  correo: user.correo,
  roles: user.roles,
  permisos: user.permisos ?? [],
  cambioContrasenaObligatorio: user.cambio_contrasena_obligatorio,
});

const isStaff = (roles) => roles.some((role) => (
  ['ADMINISTRADOR', 'VENDEDOR', 'DESARROLLADOR'].includes(role)
));

const expiration = (roles) => new Date(
  Date.now() + (isStaff(roles) ? 8 * 60 * 60 : 7 * 24 * 60 * 60) * 1000,
);

export const loginAuthService = async ({ identificador, contrasena }) => {
  const user = await findUserForLogin(identificador);
  if (!user || !user.activo || !(await verifyPassword(contrasena, user.hash_contrasena))) {
    throw new AppError(errorCodes.INVALID_CREDENTIALS);
  }
  const token = createSessionToken();
  const session = await createSession(hashToken(token), expiration(user.roles), user.id_usuario);
  return {
    token,
    expiraEn: session.expira_en,
    usuario: safeUser(user),
  };
};

export const registerAuthService = async (data) => {
  try {
    return {
      usuario: await createClientAccount(data, await hashPassword(data.contrasena)),
    };
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT);
    throw error;
  }
};

export const getSessionAuthService = async (token) => {
  const session = await findSession(hashToken(token));
  if (!session || !session.activo) {
    throw new AppError(errorCodes.INVALID_CREDENTIALS);
  }

  const now = Date.now();
  const maxIdle = isStaff(session.roles) ? 30 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  if (
    new Date(session.expira_en).getTime() <= now
    || now - new Date(session.ultima_actividad_en).getTime() > maxIdle
  ) {
    throw new AppError(errorCodes.SESSION_EXPIRED);
  }

  await touchSession(session.id_sesion);
  return { token, usuario: safeUser(session) };
};

export const logoutAuthService = (token) => revokeSession(hashToken(token));

export const changePasswordAuthService = async (session, data) => {
  const user = await findUserById(session.usuario.id);
  if (!user || !user.activo) {
    throw new AppError(errorCodes.INVALID_CREDENTIALS);
  }

  const ok = await verifyPassword(data.contrasenaActual, user.hash_contrasena);
  if (!ok) {
    throw new AppError(errorCodes.INVALID_CREDENTIALS, 401, {
      reason: 'CURRENT_PASSWORD_MISMATCH',
    });
  }

  await updatePassword(user.id_usuario, await hashPassword(data.contrasenaNueva));
  await setPasswordChangeRequired(user.id_usuario, false);
  return { changed: true };
};
