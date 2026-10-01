import {
  confirmPaymentService,
  rejectPaymentService,
} from '../services/paymentService.js';
import { sendError } from '../utils/sendError.js';

export const confirmPaymentController = async (req, res) => {
  try {
    const result = await confirmPaymentService(
      req.validated.params.id,
      req.validated.body,
      req.auth.usuario,
    );
    return res.status(result.statusHttp).json({ data: result.data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const rejectPaymentController = async (req, res) => {
  try {
    const data = await rejectPaymentService(req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
