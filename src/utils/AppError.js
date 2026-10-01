import { getErrorMessage } from '../config/errorCodes.js';

export class AppError extends Error {
  constructor(code, statusCode = null, details = null) {
    const catalog = getErrorMessage(code);
    super(catalog.message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? catalog.statusHttp ?? 500;
    this.details = details;
  }
}
