import { Router } from 'express';
import {
  confirmPaymentController,
  createStripeCartCheckoutController,
  rejectPaymentController,
} from '../controllers/paymentController.js';
import {
  confirmPaymentDto,
  createStripeCartCheckoutDto,
  paymentIdParamsDto,
} from '../dto/payment.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams } from '../middlewares/validateDto.js';

const paymentRouter = Router();
const manageSales = [authenticate, requirePermissions('VENTAS_GESTIONAR')];

paymentRouter.post(
  '/stripe/carrito',
  authenticate,
  validateBody(createStripeCartCheckoutDto),
  createStripeCartCheckoutController,
);

paymentRouter.post(
  '/:id/confirmar',
  ...manageSales,
  validateParams(paymentIdParamsDto),
  validateBody(confirmPaymentDto),
  confirmPaymentController,
);
paymentRouter.post(
  '/:id/rechazar',
  ...manageSales,
  validateParams(paymentIdParamsDto),
  rejectPaymentController,
);

export default paymentRouter;
