export const errorCodes = {
  VALIDATION_ERROR: 'BR001',
  INVALID_CREDENTIALS: 'AU001',
  SESSION_EXPIRED: 'AU002',
  MISSING_TOKEN: 'AU003',
  ACCOUNT_LOCKED: 'AU004',
  ACCESS_DENIED: 'FB001',
  NOT_FOUND: 'NF001',
  CONFLICT: 'CF001',
  BUSINESS_RULE: 'UE001',
  INTERNAL_ERROR: 'SE001',
  SERVICE_UNAVAILABLE: 'SU001',
};

export const errorCatalog = {
  [errorCodes.VALIDATION_ERROR]: { statusHttp: 400, message: 'Datos de solicitud inválidos' },
  [errorCodes.INVALID_CREDENTIALS]: { statusHttp: 401, message: 'Credenciales o sesión inválidas' },
  [errorCodes.SESSION_EXPIRED]: { statusHttp: 401, message: 'Sesión expirada' },
  [errorCodes.MISSING_TOKEN]: { statusHttp: 401, message: 'Autenticación requerida' },
  [errorCodes.ACCOUNT_LOCKED]: {
    statusHttp: 423,
    message: 'Cuenta bloqueada por demasiados intentos fallidos. Espere unos minutos.',
  },
  [errorCodes.ACCESS_DENIED]: { statusHttp: 403, message: 'Acceso denegado' },
  [errorCodes.NOT_FOUND]: { statusHttp: 404, message: 'Recurso no encontrado' },
  [errorCodes.CONFLICT]: { statusHttp: 409, message: 'Conflicto de recurso' },
  [errorCodes.BUSINESS_RULE]: { statusHttp: 422, message: 'No se puede cumplir la regla de negocio' },
  [errorCodes.INTERNAL_ERROR]: {
    statusHttp: 500,
    message: 'Error interno del servidor',
  },
  [errorCodes.SERVICE_UNAVAILABLE]: {
    statusHttp: 503,
    message: 'Servicio no disponible',
  },
};

export const getErrorMessage = (code) => errorCatalog[code] ?? errorCatalog[errorCodes.INTERNAL_ERROR];
