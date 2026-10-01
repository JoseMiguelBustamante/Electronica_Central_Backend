import { Router } from 'express';
import {
  createSupplierController,
  getSupplierController,
  listSuppliersController,
  updateSupplierController,
} from '../controllers/supplierController.js';
import {
  createSupplierDto,
  listSuppliersQueryDto,
  supplierIdParamsDto,
  updateSupplierDto,
} from '../dto/supplier.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const supplierRouter = Router();
const managePurchases = [authenticate, requirePermissions('COMPRAS_GESTIONAR')];

supplierRouter.get('/', ...managePurchases, validateQuery(listSuppliersQueryDto), listSuppliersController);
supplierRouter.post('/', ...managePurchases, validateBody(createSupplierDto), createSupplierController);
supplierRouter.get(
  '/:id',
  ...managePurchases,
  validateParams(supplierIdParamsDto),
  getSupplierController,
);
supplierRouter.patch(
  '/:id',
  ...managePurchases,
  validateParams(supplierIdParamsDto),
  validateBody(updateSupplierDto),
  updateSupplierController,
);

export default supplierRouter;
