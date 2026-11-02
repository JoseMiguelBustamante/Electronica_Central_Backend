import { logger } from '../lib/logger.js';
import {
  confirmPaymentService,
  createOnlinePaymentService,
  handleStripeWebhookService,
  rejectPaymentService,
} from '../services/paymentService.js';
import { createStripeCheckoutForCartService } from '../services/stripePaymentService.js';
import { sendError } from '../utils/sendError.js';

export const createOnlinePaymentController = async (req, res) => {
  try {
    const data = await createOnlinePaymentService(
      req.validated.params.id,
      req.validated.body,
      req.auth.usuario,
    );
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createStripeCartCheckoutController = async (req, res) => {
  try {
    const data = await createStripeCheckoutForCartService(
      req.validated.body,
      req.auth.usuario,
    );
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const stripeWebhookController = async (req, res) => {
  try {
    const result = await handleStripeWebhookService(req.body, req.get('stripe-signature'));
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    if (!error.statusCode) logger.error('stripe.webhook_failed', { message: error.message });
    return sendError(res, error);
  }
};

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
