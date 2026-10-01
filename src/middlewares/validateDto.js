import { errorCodes } from '../config/errorCodes.js';
import { AppError } from '../utils/AppError.js';

const validate = (source, schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) return next(new AppError(errorCodes.VALIDATION_ERROR, 400, parsed.error.flatten()));
  req.validated = { ...req.validated, [source]: parsed.data };
  return next();
};

export const validateBody = (schema) => validate('body', schema);
export const validateQuery = (schema) => validate('query', schema);
export const validateParams = (schema) => validate('params', schema);
