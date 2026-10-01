import {
  createClientService,
  createUserService,
  listClientsService,
  listLogsService,
  listUsersService,
  resetUserService,
} from '../services/securityService.js';
import { sendError } from '../utils/sendError.js';

const wrap = (fn, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await fn(req) });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createClientController = wrap(
  (req) => createClientService(req.validated.body, req.auth.usuario),
  201,
);

export const listClientsController = wrap(() => listClientsService());

export const listUsersController = wrap(() => listUsersService());

export const createUserController = wrap(
  (req) => createUserService(req.validated.body, req.auth.usuario),
  201,
);

export const resetUserController = wrap((req) => resetUserService(
  req.validated.params.id,
  req.validated.body,
  req.auth.usuario,
));

export const listLogsController = wrap(() => listLogsService());
