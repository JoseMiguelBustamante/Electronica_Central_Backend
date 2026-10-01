import {
  createRequestService,
  getRequestService,
  listRequestsService,
  updateRequestEstadoService,
} from '../services/requestService.js';
import { sendError } from '../utils/sendError.js';

export const listRequestsController = async (req, res) => {
  try {
    const result = await listRequestsService(req.validated.query, req.auth.usuario);
    return res.status(200).json({
      data: result.items,
      meta: { pagina: result.pagina, limite: result.limite, total: result.total },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getRequestController = async (req, res) => {
  try {
    const data = await getRequestService(req.validated.params.id, req.auth.usuario);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createRequestController = async (req, res) => {
  try {
    const data = await createRequestService(req.validated.body, req.auth.usuario);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateRequestEstadoController = async (req, res) => {
  try {
    const data = await updateRequestEstadoService(
      req.validated.params.id,
      req.validated.body,
      req.auth.usuario,
    );
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
