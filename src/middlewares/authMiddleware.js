import { errorCodes } from '../config/errorCodes.js';
import { getSessionAuthService } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

const isAllowedWhenPasswordChangeRequired = (req) => {
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`;
  return fullPath.endsWith('/cambiar-contrasena') || fullPath.endsWith('/logout');
};

export const authenticate = async (req, _res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(errorCodes.MISSING_TOKEN);
    }

    req.auth = await getSessionAuthService(token);

    if (
      req.auth.usuario.cambioContrasenaObligatorio
      && !isAllowedWhenPasswordChangeRequired(req)
    ) {
      throw new AppError(errorCodes.ACCESS_DENIED);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
