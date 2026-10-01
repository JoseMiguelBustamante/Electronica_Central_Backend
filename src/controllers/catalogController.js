import {
  createBrandService,
  createCategoryService,
  createCompatibilityService,
  createLocationService,
  createModelService,
  createProductService,
  createUnitService,
  deactivateProductService,
  deleteCompatibilityService,
  getCatalogFiltersService,
  getPublicProductByIdService,
  getPublicProductsService,
} from '../services/catalogService.js';
import { sendError } from '../utils/sendError.js';

const createCatalogController = (service) => async (req, res) => {
  try {
    const data = await service(req.validated.body);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createCategoryController = createCatalogController(createCategoryService);
export const createBrandController = createCatalogController(createBrandService);
export const createUnitController = createCatalogController(createUnitService);
export const createLocationController = createCatalogController(createLocationService);
export const createModelController = createCatalogController(createModelService);
export const createProductController = createCatalogController(createProductService);

export const deactivateProductController = async (req, res) => {
  try {
    const data = await deactivateProductService(req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createCompatibilityController = async (req, res) => {
  try {
    const data = await createCompatibilityService({
      idProducto: req.validated.params.id,
      ...req.validated.body,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteCompatibilityController = async (req, res) => {
  try {
    const data = await deleteCompatibilityService(req.validated.params.id, req.validated.params.idModelo);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPublicProductsController = async (req, res) => {
  try {
    const result = await getPublicProductsService(req.validated.query);
    return res.status(200).json({
      data: result.products,
      meta: { pagina: result.pagina, limite: result.limite, total: result.total },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPublicProductByIdController = async (req, res) => {
  try {
    return res.status(200).json({ data: await getPublicProductByIdService(req.validated.params.id) });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCatalogFiltersController = async (_req, res) => {
  try {
    const rows = await getCatalogFiltersService();
    const data = { categorias: [], marcas: [], modelos: [] };
    for (const row of rows) data[`${row.tipo.toLowerCase()}s`].push({ id: row.id, nombre: row.nombre });
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};
