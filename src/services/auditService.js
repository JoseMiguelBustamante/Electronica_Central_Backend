import { logger } from '../lib/logger.js';
import { addLog } from '../repositories/securityRepository.js';

/** Client IP as Postgres `inet` text (Express already honours `trust proxy`). */
export const clientIp = (req) => {
  const ip = req?.ip?.replace(/^::ffff:/, '');
  return ip || null;
};

/**
 * Writes one bitácora row (CU-3). Never fails the business operation that
 * triggered it: an audit error is logged and swallowed.
 */
export const audit = async (req, accion, tabla, objeto, { resultado = 'OK', idUsuario } = {}) => {
  try {
    await addLog(accion, String(objeto ?? ''), resultado, idUsuario ?? req?.auth?.usuario?.id ?? null, {
      ip: clientIp(req),
      tabla,
    });
  } catch (error) {
    logger.warn('audit_failed', { accion, tabla, message: error.message });
  }
};
