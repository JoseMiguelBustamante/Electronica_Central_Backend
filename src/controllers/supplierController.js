import {
  createSupplierService,
  getSupplierService,
  listSuppliersService,
  updateSupplierService,
} from '../services/supplierService.js';
import { sendError } from '../utils/sendError.js';

export const listSuppliersController = async (req, res) => {
  try {
    const result = await listSuppliersService(req.validated.query);
    return res.status(200).json({
      data: result.items,
      meta: { pagina: result.pagina, limite: result.limite, total: result.total },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getSupplierController = async (req, res) => {
  try {
    const data = await getSupplierService(req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createSupplierController = async (req, res) => {
  try {
    const data = await createSupplierService(req.validated.body);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateSupplierController = async (req, res) => {
  try {
    const data = await updateSupplierService(req.validated.params.id, req.validated.body);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
