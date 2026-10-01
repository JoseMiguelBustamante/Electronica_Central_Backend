import { Router } from 'express';
import { errorCodes } from '../config/errorCodes.js';
import {
  createClientController,
  createUserController,
  listClientsController,
  listLogsController,
  listUsersController,
  resetUserController,
} from '../controllers/securityController.js';
import {
  createClientDto,
  createUserDto,
  resetUserDto,
  userIdDto,
} from '../dto/security.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { AppError } from '../utils/AppError.js';

const validateUserId = (req, _res, next) => {
  const parsed = userIdDto.safeParse(req.params);
  if (!parsed.success) {
    return next(new AppError(errorCodes.VALIDATION_ERROR, 400, parsed.error.flatten()));
  }
  req.validated = { ...req.validated, params: parsed.data };
  return next();
};

const securityRouter = Router();
securityRouter.use(authenticate);

securityRouter.get(
  '/usuarios',
  requirePermissions('USUARIOS_GESTIONAR'),
  listUsersController,
);
securityRouter.post(
  '/usuarios',
  requirePermissions('USUARIOS_GESTIONAR'),
  validateBody(createUserDto),
  createUserController,
);
securityRouter.post(
  '/usuarios/:id/restablecer',
  requirePermissions('USUARIOS_GESTIONAR'),
  validateUserId,
  validateBody(resetUserDto),
  resetUserController,
);
securityRouter.get(
  '/clientes',
  requirePermissions('CLIENTES_GESTIONAR'),
  listClientsController,
);
securityRouter.post(
  '/clientes',
  requirePermissions('CLIENTES_GESTIONAR'),
  validateBody(createClientDto),
  createClientController,
);
securityRouter.get(
  '/bitacora',
  requirePermissions('BITACORA_CONSULTAR'),
  listLogsController,
);

export default securityRouter;
