import { Router } from 'express';
import {
  confirmOpeningController,
  createInventoryAdjustmentController,
  getInventoryAlertsController,
  getInventoryListController,
  getInventoryMovementsController,
  previewOpeningController,
  updateStockMinimoController,
} from '../controllers/inventoryController.js';
import {
  confirmOpeningDto,
  createInventoryAdjustmentDto,
  inventoryProductoIdParamsDto,
  listInventoryAlertsQueryDto,
  listInventoryMovementsQueryDto,
  listInventoryQueryDto,
  previewOpeningDto,
  updateStockMinimoDto,
} from '../dto/inventory.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const inventoryRouter = Router();
const consultInventory = [authenticate, requirePermissions('INVENTARIO_CONSULTAR')];
const manageInventory = [authenticate, requirePermissions('INVENTARIO_GESTIONAR')];

inventoryRouter.get('/', ...consultInventory, validateQuery(listInventoryQueryDto), getInventoryListController);
inventoryRouter.get('/alertas', ...consultInventory, validateQuery(listInventoryAlertsQueryDto), getInventoryAlertsController);
inventoryRouter.get(
  '/:productoId/movimientos',
  ...consultInventory,
  validateParams(inventoryProductoIdParamsDto),
  validateQuery(listInventoryMovementsQueryDto),
  getInventoryMovementsController,
);
inventoryRouter.patch(
  '/:productoId',
  ...manageInventory,
  validateParams(inventoryProductoIdParamsDto),
  validateBody(updateStockMinimoDto),
  updateStockMinimoController,
);
inventoryRouter.post(
  '/ajustes',
  ...manageInventory,
  validateBody(createInventoryAdjustmentDto),
  createInventoryAdjustmentController,
);
inventoryRouter.post(
  '/aperturas/preview',
  ...manageInventory,
  validateBody(previewOpeningDto),
  previewOpeningController,
);
inventoryRouter.post(
  '/aperturas/confirm',
  ...manageInventory,
  validateBody(confirmOpeningDto),
  confirmOpeningController,
);

export default inventoryRouter;
