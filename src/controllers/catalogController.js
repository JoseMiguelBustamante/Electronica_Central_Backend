import {
  createBrandService,
  createCategoryService,
  createCompatibilityService,
  createLocationService,
  createModelService,
  createProductService,
  createUnitService,
  deleteBrandService,
  deleteCategoryService,
  deleteCompatibilityService,
  deleteModelService,
  deleteUnitService,
  getCatalogFiltersService,
  getPublicProductByIdService,
  getPublicProductsService,
  listAdminProductsService,
  listBrandsService,
  listCategoriesService,
  listCompatibilitiesService,
  listLocationsService,
  listModelsService,
  listUnitsService,
  updateBrandService,
  updateCategoryService,
  updateModelService,
  updateProductService,
  updateUnitService,
} from '../services/catalogService.js';
import { audit } from '../services/auditService.js';
import { sendError } from '../utils/sendError.js';

/** Audited mutation: `tabla` is the affected table, `idColumn` the PK returned by the service. */
const createCatalogController = (service, accion, tabla, idColumn) => async (req, res) => {
  try {
    const data = await service(req.validated.body);
    await audit(req, accion, tabla, data[idColumn]);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCatalogController = (service, accion, tabla) => async (req, res) => {
  try {
    const data = await service(req.validated.params.id, req.validated.body);
    await audit(req, accion, tabla, req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteCatalogController = (service, accion, tabla) => async (req, res) => {
  try {
    const data = await service(req.validated.params.id);
    await audit(req, accion, tabla, req.validated.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createCategoryController = createCatalogController(createCategoryService, 'CATEGORIA_CREADA', 'categoria', 'id_categoria');
export const createBrandController = createCatalogController(createBrandService, 'MARCA_CREADA', 'marca', 'id_marca');
export const createUnitController = createCatalogController(createUnitService, 'UNIDAD_CREADA', 'unidad_medida', 'id_unidad_medida');
export const createLocationController = createCatalogController(createLocationService, 'UBICACION_CREADA', 'ubicacion', 'id_ubicacion');
export const createModelController = createCatalogController(createModelService, 'MODELO_CREADO', 'modelo', 'id_modelo');
export const createProductController = createCatalogController(createProductService, 'PRODUCTO_CREADO', 'producto', 'id_producto');

export const updateCategoryController = updateCatalogController(updateCategoryService, 'CATEGORIA_EDITADA', 'categoria');
export const updateBrandController = updateCatalogController(updateBrandService, 'MARCA_EDITADA', 'marca');
export const updateUnitController = updateCatalogController(updateUnitService, 'UNIDAD_EDITADA', 'unidad_medida');
export const updateModelController = updateCatalogController(updateModelService, 'MODELO_EDITADO', 'modelo');

export const deleteCategoryController = deleteCatalogController(deleteCategoryService, 'CATEGORIA_ELIMINADA', 'categoria');
export const deleteBrandController = deleteCatalogController(deleteBrandService, 'MARCA_ELIMINADA', 'marca');
export const deleteUnitController = deleteCatalogController(deleteUnitService, 'UNIDAD_ELIMINADA', 'unidad_medida');
export const deleteModelController = deleteCatalogController(deleteModelService, 'MODELO_ELIMINADO', 'modelo');

export const updateProductController = async (req, res) => {
  try {
    const { id } = req.validated.params;
    const body = req.validated.body;
    const data = await updateProductService(id, body);
    const soloEstado = Object.keys(body).length === 1 && body.activo !== undefined;
    const accion = soloEstado ? (body.activo ? 'PRODUCTO_ACTIVADO' : 'PRODUCTO_DESACTIVADO') : 'PRODUCTO_EDITADO';
    await audit(req, accion, 'producto', id);
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listAdminProductsController = async (req, res) => {
  try {
    const result = await listAdminProductsService(req.validated.query);
    return res.status(200).json({
      data: result.products,
      meta: { pagina: result.pagina, limite: result.limite, total: result.total },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listCompatibilitiesController = async (req, res) => {
  try {
    return res.status(200).json({ data: await listCompatibilitiesService(req.validated.params.id) });
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
    await audit(req, 'COMPATIBILIDAD_CREADA', 'compatibilidad', `${data.id_producto}:${data.id_modelo}`);
    return res.status(201).json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteCompatibilityController = async (req, res) => {
  try {
    const { id, idModelo } = req.validated.params;
    const data = await deleteCompatibilityService(id, idModelo);
    await audit(req, 'COMPATIBILIDAD_ELIMINADA', 'compatibilidad', `${id}:${idModelo}`);
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

const listCatalogController = (service) => async (_req, res) => {
  try {
    return res.status(200).json({ data: await service() });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listCategoriesController = listCatalogController(listCategoriesService);
export const listBrandsController = listCatalogController(listBrandsService);
export const listUnitsController = listCatalogController(listUnitsService);
export const listLocationsController = listCatalogController(listLocationsService);
export const listModelsController = listCatalogController(listModelsService);

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
