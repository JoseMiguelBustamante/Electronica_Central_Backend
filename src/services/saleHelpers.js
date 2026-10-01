import { errorCodes } from '../config/errorCodes.js';
import { AppError } from '../utils/AppError.js';

export const roundHalfUp2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'INVALID_AMOUNT' });
  }
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
};

export const assertAtMostOneDecimal = (monto) => {
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'INVALID_PAYMENT_AMOUNT' });
  }
  const asText = String(monto);
  const decimalPart = asText.includes('.') ? asText.split('.')[1].replace(/0+$/, '') : '';
  if (decimalPart.length > 1) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, { reason: 'TOO_MANY_DECIMALS' });
  }
  return n;
};

/** Excel-style ceiling to next 0.50 step: 5.20→5.50, 4.60→5.00 */
export const ceilToHalfStep = (monto) => {
  const n = assertAtMostOneDecimal(monto);
  return Number((Math.ceil(n / 0.5) * 0.5).toFixed(2));
};
