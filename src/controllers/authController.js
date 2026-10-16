import {
  changePasswordAuthService,
  loginAuthService,
  logoutAuthService,
  registerAuthService,
  requestPasswordRecoveryService,
  resetPasswordWithTokenService,
} from '../services/authService.js';
import { audit } from '../services/auditService.js';
import { sendError } from '../utils/sendError.js';

export const registerAuthController = async (req, res) => {
  try {
    return res.status(201).json({ data: await registerAuthService(req.validated.body) });
  } catch (error) {
    return sendError(res, error);
  }
};

export const loginAuthController = async (req, res) => {
  try {
    const data = await loginAuthService(req.validated.body);
    await audit(req, 'INICIO_SESION', 'sesion_usuario', data.usuario.id, { idUsuario: data.usuario.id });
    return res.status(200).json({ data });
  } catch (error) {
    await audit(req, 'INICIO_SESION', 'sesion_usuario', req.validated.body.identificador, { resultado: 'FALLIDO' });
    return sendError(res, error);
  }
};

export const getMeAuthController = (req, res) => (
  res.status(200).json({ data: req.auth.usuario })
);

export const logoutAuthController = async (req, res) => {
  try {
    await logoutAuthService(req.auth.token);
    await audit(req, 'CIERRE_SESION', 'sesion_usuario', req.auth.usuario.id);
    return res.status(200).json({ data: { loggedOut: true } });
  } catch (error) {
    return sendError(res, error);
  }
};

export const changePasswordAuthController = async (req, res) => {
  try {
    return res.status(200).json({
      data: await changePasswordAuthService(req.auth, req.validated.body),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const recoverPasswordAuthController = async (req, res) => {
  try {
    return res.status(200).json({
      data: await requestPasswordRecoveryService(req.validated.body),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const resetPasswordAuthController = async (req, res) => {
  try {
    return res.status(200).json({
      data: await resetPasswordWithTokenService(req.validated.body),
    });
  } catch (error) {
    return sendError(res, error);
  }
};
