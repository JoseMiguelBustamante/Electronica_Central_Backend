import {
  createReturnService,
  getReturnService,
  listReturnsService,
} from '../services/returnService.js';
import { audit } from '../services/auditService.js';
import { sendError } from '../utils/sendError.js';

export const listReturnsController = async (req, res) => {
  try {
    const data = await listReturnsService(req.validated.query);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getReturnController = async (req, res) => {
  try {
    const data = await getReturnService(req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createReturnController = async (req, res) => {
  try {
    const data = await createReturnService(req.validated.body, req.auth.usuario);
    await audit(req, 'DEVOLUCION_DEFECTUOSO', 'devolucion', data.idDevolucion);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
