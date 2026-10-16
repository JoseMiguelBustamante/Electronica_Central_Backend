import {
  createClientService,
  createUserService,
  listClientsService,
  listLogsService,
  listUsersService,
  resetUserService,
  updateUserService,
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
  (req) => createClientService(req.validated.body, req.auth.usuario, req),
  201,
);

export const listClientsController = wrap(() => listClientsService());

export const listUsersController = wrap(() => listUsersService());

export const createUserController = wrap(
  (req) => createUserService(req.validated.body, req.auth.usuario, req),
  201,
);

export const resetUserController = wrap((req) => resetUserService(
  req.validated.params.id,
  req.validated.body,
  req.auth.usuario,
  req,
));

export const updateUserController = wrap((req) => updateUserService(
  req.validated.params.id,
  req.validated.body,
  req.auth.usuario,
  req,
));

export const listLogsController = wrap((req) => listLogsService(req.validated.query));
