import { getHealthService, getReadinessService } from '../services/healthService.js';
import { errorCodes } from '../config/errorCodes.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/sendError.js';

export const getHealthController = (_req, res) => {
  try {
    return res.status(200).json({ data: getHealthService() });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getReadinessController = async (_req, res) => {
  try {
    const readiness = await getReadinessService();
    if (readiness.status !== 'ready') {
      throw new AppError(errorCodes.SERVICE_UNAVAILABLE, 503, readiness);
    }
    return res.status(200).json({ data: readiness });
  } catch (error) {
    return sendError(res, error);
  }
};
