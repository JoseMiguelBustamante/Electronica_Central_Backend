import {
  cancelPurchaseService,
  createPurchaseService,
  getPurchaseService,
  listPurchasesService,
  receivePurchaseService,
  updatePurchaseService,
} from '../services/purchaseService.js';
import { audit } from '../services/auditService.js';
import { sendError } from '../utils/sendError.js';

export const listPurchasesController = async (req, res) => {
  try {
    const result = await listPurchasesService(req.validated.query);
    return res.status(200).json({
      data: result.items,
      meta: { pagina: result.pagina, limite: result.limite, total: result.total },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPurchaseController = async (req, res) => {
  try {
    const data = await getPurchaseService(req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createPurchaseController = async (req, res) => {
  try {
    const data = await createPurchaseService(req.validated.body, req.auth.usuario);
    await audit(req, 'COMPRA_CREADA', 'compra', data.idCompra);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updatePurchaseController = async (req, res) => {
  try {
    const data = await updatePurchaseService(req.validated.params.id, req.validated.body);
    await audit(req, 'COMPRA_EDITADA', 'compra', req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const receivePurchaseController = async (req, res) => {
  try {
    const result = await receivePurchaseService(
      req.validated.params.id,
      req.validated.body,
      req.auth.usuario,
    );
    if (!result.cached) await audit(req, 'COMPRA_RECIBIDA', 'compra', req.validated.params.id);
    return res.status(result.statusHttp).json({ data: result.data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const cancelPurchaseController = async (req, res) => {
  try {
    const data = await cancelPurchaseService(req.validated.params.id);
    await audit(req, 'COMPRA_CANCELADA', 'compra', req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
