import { Router } from 'express';
import {
  cancelPurchaseController,
  createPurchaseController,
  getPurchaseController,
  listPurchasesController,
  receivePurchaseController,
  updatePurchaseController,
} from '../controllers/purchaseController.js';
import {
  createPurchaseDto,
  listPurchasesQueryDto,
  purchaseIdParamsDto,
  receivePurchaseDto,
  updatePurchaseDto,
} from '../dto/purchase.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const purchaseRouter = Router();
const managePurchases = [authenticate, requirePermissions('COMPRAS_GESTIONAR')];

purchaseRouter.get('/', ...managePurchases, validateQuery(listPurchasesQueryDto), listPurchasesController);
purchaseRouter.post('/', ...managePurchases, validateBody(createPurchaseDto), createPurchaseController);
purchaseRouter.get(
  '/:id',
  ...managePurchases,
  validateParams(purchaseIdParamsDto),
  getPurchaseController,
);
purchaseRouter.patch(
  '/:id',
  ...managePurchases,
  validateParams(purchaseIdParamsDto),
  validateBody(updatePurchaseDto),
  updatePurchaseController,
);
purchaseRouter.post(
  '/:id/recibir',
  ...managePurchases,
  validateParams(purchaseIdParamsDto),
  validateBody(receivePurchaseDto),
  receivePurchaseController,
);
purchaseRouter.post(
  '/:id/cancelar',
  ...managePurchases,
  validateParams(purchaseIdParamsDto),
  cancelPurchaseController,
);

export default purchaseRouter;
