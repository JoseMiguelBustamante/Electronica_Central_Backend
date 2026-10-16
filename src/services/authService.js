import { errorCodes } from '../config/errorCodes.js';
import {
  clearLoginFailures,
  createClientAccount,
  createRecoveryToken,
  createSession,
  findSession,
  findUserByEmail,
  findUserById,
  findUserForLogin,
  findValidRecoveryToken,
  markRecoveryTokenUsed,
  registerLoginFailure,
  resetAttemptsAfterLockExpired,
  revokeAllUserSessions,
  revokeSession,
  setPasswordChangeRequired,
  touchSession,
  updatePassword,
} from '../repositories/authRepository.js';
import { addLog } from '../repositories/securityRepository.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../lib/logger.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createSessionToken, hashToken } from '../utils/token.js';

const MAX_LOGIN_ATTEMPTS = 3;
/** First lock lasts 2 minutes; each later lock cycle doubles (2 → 4 → 8 …). */
const LOCK_BASE_MINUTES = 2;
const LOCK_MAX_MINUTES = 60;
const RECOVERY_HOURS = 1;

const lockMinutesForNextNivel = (nivelActual) => Math.min(
  LOCK_BASE_MINUTES * (2 ** Math.max(0, nivelActual)),
  LOCK_MAX_MINUTES,
);

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

const isLocked = (user) => {
  if (!user?.bloqueado_hasta) return false;
  return new Date(user.bloqueado_hasta).getTime() > Date.now();
};

const throwLocked = (user, minutosBloqueo) => {
  throw new AppError(errorCodes.ACCOUNT_LOCKED, 423, {
    message: `Cuenta bloqueada por demasiados intentos fallidos. Espere ${minutosBloqueo} minuto(s).`,
    bloqueadoHasta: user.bloqueado_hasta,
    intentosMaximos: MAX_LOGIN_ATTEMPTS,
    minutosBloqueo,
    nivelBloqueo: user.nivel_bloqueo ?? 0,
  });
};

export const loginAuthService = async ({ identificador, contrasena }) => {
  let user = await findUserForLogin(identificador);

  if (user && isLocked(user)) {
    const minutos = lockMinutesForNextNivel(Math.max(0, (user.nivel_bloqueo ?? 1) - 1));
    throwLocked(user, minutos);
  }

  // Lock window expired: fresh 3 attempts, but keep escalating nivel on the next lock.
  if (user?.bloqueado_hasta && !isLocked(user) && (user.intentos_fallidos ?? 0) > 0) {
    await resetAttemptsAfterLockExpired(user.id_usuario);
    user = { ...user, intentos_fallidos: 0, bloqueado_hasta: null };
  }

  const passwordOk = user && user.activo
    ? await verifyPassword(contrasena, user.hash_contrasena)
    : false;

  if (!user || !user.activo || !passwordOk) {
    if (user && user.activo) {
      const minutos = lockMinutesForNextNivel(user.nivel_bloqueo ?? 0);
      const updated = await registerLoginFailure(user.id_usuario, MAX_LOGIN_ATTEMPTS, minutos);
      if (updated && updated.intentos_fallidos >= MAX_LOGIN_ATTEMPTS) {
        throw new AppError(errorCodes.ACCOUNT_LOCKED, 423, {
          message: `Cuenta bloqueada por demasiados intentos fallidos. Espere ${minutos} minuto(s).`,
          bloqueadoHasta: updated.bloqueado_hasta,
          intentosMaximos: MAX_LOGIN_ATTEMPTS,
          intentosFallidos: updated.intentos_fallidos,
          minutosBloqueo: minutos,
          nivelBloqueo: updated.nivel_bloqueo,
        });
      }
      throw new AppError(errorCodes.INVALID_CREDENTIALS, 401, {
        intentosRestantes: Math.max(0, MAX_LOGIN_ATTEMPTS - (updated?.intentos_fallidos ?? 0)),
        intentosMaximos: MAX_LOGIN_ATTEMPTS,
      });
    }
    throw new AppError(errorCodes.INVALID_CREDENTIALS);
  }

  await clearLoginFailures(user.id_usuario);
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

/**
 * Always returns the same shape (anti-enumeration).
 * Sends email when SMTP_URL is set; otherwise logs the recovery link for ops.
 */
export const requestPasswordRecoveryService = async ({ correo }) => {
  const generic = {
    enviado: true,
    mensaje: 'Si el correo existe, enviamos instrucciones para restablecer la contraseña.',
  };

  const user = await findUserByEmail(correo);
  if (!user || !user.activo) {
    return generic;
  }

  const token = createSessionToken();
  const expiraEn = new Date(Date.now() + RECOVERY_HOURS * 60 * 60 * 1000);
  await createRecoveryToken(user.id_usuario, hashToken(token), expiraEn);

  const front = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const link = `${front}/restablecer?token=${encodeURIComponent(token)}`;

  const smtp = process.env.SMTP_URL?.trim();
  if (smtp) {
    // Optional: wire a real SMTP client later. Keep the contract stable.
    logger.info('password_recovery_email_queued', { correo: user.correo });
  } else {
    logger.info('password_recovery_link', { correo: user.correo, link, expiraEn });
  }

  await addLog('RECUPERACION_SOLICITADA', user.id_usuario, 'OK', user.id_usuario);

  if (process.env.NODE_ENV !== 'production') {
    return { ...generic, debugToken: token, debugLink: link };
  }
  return generic;
};

export const resetPasswordWithTokenService = async ({ token, contrasenaNueva }) => {
  const row = await findValidRecoveryToken(hashToken(token));
  if (!row || !row.activo) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'TOKEN_INVALIDO',
      message: 'El enlace de restablecimiento no es válido o ya expiró.',
    });
  }

  await updatePassword(row.id_usuario, await hashPassword(contrasenaNueva));
  await setPasswordChangeRequired(row.id_usuario, false);
  await clearLoginFailures(row.id_usuario);
  await markRecoveryTokenUsed(row.id_token);
  await revokeAllUserSessions(row.id_usuario);
  await addLog('CONTRASENA_RESTABLECIDA', row.id_usuario, 'OK', row.id_usuario);

  return { restablecido: true };
};
