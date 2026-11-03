import { Router } from 'express';
import {
  createReturnController,
  getReturnController,
  listReturnsController,
} from '../controllers/returnController.js';
import {
  createReturnDto,
  listReturnsQueryDto,
  returnIdParamsDto,
} from '../dto/return.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const returnRouter = Router();
const manageReturns = [authenticate, requirePermissions('VENTAS_GESTIONAR')];

returnRouter.get('/', ...manageReturns, validateQuery(listReturnsQueryDto), listReturnsController);
returnRouter.post('/', ...manageReturns, validateBody(createReturnDto), createReturnController);
returnRouter.get('/:id', ...manageReturns, validateParams(returnIdParamsDto), getReturnController);

export default returnRouter;
