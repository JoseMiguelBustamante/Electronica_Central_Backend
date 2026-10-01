import { Router } from 'express';
import {
  createRequestController,
  getRequestController,
  listRequestsController,
  updateRequestEstadoController,
} from '../controllers/requestController.js';
import {
  createRequestDto,
  listRequestsQueryDto,
  requestIdParamsDto,
  updateRequestEstadoDto,
} from '../dto/request.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const requestRouter = Router();

// Auth only — service enforces Cliente ownership vs SOLICITUDES_GESTIONAR / Admin status.
requestRouter.use(authenticate);

requestRouter.get('/', validateQuery(listRequestsQueryDto), listRequestsController);
requestRouter.post('/', validateBody(createRequestDto), createRequestController);
requestRouter.get('/:id', validateParams(requestIdParamsDto), getRequestController);
requestRouter.patch(
  '/:id/estado',
  validateParams(requestIdParamsDto),
  validateBody(updateRequestEstadoDto),
  updateRequestEstadoController,
);

export default requestRouter;
