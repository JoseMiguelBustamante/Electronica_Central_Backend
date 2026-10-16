import { errorCodes, getErrorMessage } from '../config/errorCodes.js';

export const sendError = (res, error) => {
  const code = error.code ?? errorCodes.INTERNAL_ERROR;
  const catalog = getErrorMessage(code);
  const statusCode = error.statusCode ?? catalog.statusHttp ?? 500;
  const payload = {
    error: {
      code,
      message: catalog.message ?? 'Internal server error',
    },
  };

  if (error.details) {
    payload.error.details = error.details;
    if (typeof error.details.message === 'string' && error.details.message.trim()) {
      payload.error.message = error.details.message;
    }
  }

  return res.status(statusCode).json(payload);
};
