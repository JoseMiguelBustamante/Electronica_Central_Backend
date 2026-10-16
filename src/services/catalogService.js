import { errorCodes } from '../config/errorCodes.js';
import {
  createBrand,
  createCategory,
  createCompatibility,
  createLocation,
  createModel,
  createProduct,
  createUnit,
  deleteBrand,
  deleteCategory,
  deleteCompatibility,
  deleteModel,
  deleteUnit,
  getCatalogFilters,
  getPublicProductById,
  getPublicProducts,
  listAdminProducts,
  listBrands,
  listCategories,
  listCompatibilities,
  listLocations,
  listModels,
  listUnits,
  productExists,
  updateBrand,
  updateCategory,
  updateModel,
  updateProduct,
  updateUnit,
} from '../repositories/catalogRepository.js';
import { AppError } from '../utils/AppError.js';

const translateDatabaseError = (error) => {
  if (error.code === '23505') throw new AppError(errorCodes.CONFLICT);
  if (error.code === '23503') throw new AppError(errorCodes.NOT_FOUND);
  if (error.code === 'MODEL_BRAND_MISMATCH') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'MODEL_BRAND_MISMATCH',
      ...(error.details ?? {}),
    });
  }
  if (error.code === 'MODEL_IN_USE_BY_OTHER_BRAND') {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      reason: 'MODEL_IN_USE_BY_OTHER_BRAND',
      message: 'Hay productos con este modelo y su marca actual; no se puede cambiar la marca del modelo.',
    });
  }
  throw error;
};

const getCreatedRow = async (repository, parameters) => {
  try {
    return (await repository(...parameters)).rows[0];
  } catch (error) {
    return translateDatabaseError(error);
  }
};

const getUpdatedRow = async (repository, id, data) => {
  let result;
  try {
    result = await repository(id, data);
  } catch (error) {
    return translateDatabaseError(error);
  }
  if (!result.rows[0]) throw new AppError(errorCodes.NOT_FOUND);
  return result.rows[0];
};

/** DELETE that hits a foreign key means the row is still referenced (products, models, sales…). */
const deleteRow = async (repository, id, enUso) => {
  let result;
  try {
    result = await repository(id);
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError(errorCodes.CONFLICT, 409, { reason: 'IN_USE', message: enUso });
    }
    throw error;
  }
  if (!result.rows[0]) throw new AppError(errorCodes.NOT_FOUND);
  return result.rows[0];
};

export const createCategoryService = ({ nombre, descripcion }) => getCreatedRow(createCategory, [nombre, descripcion]);
export const createBrandService = ({ nombre }) => getCreatedRow(createBrand, [nombre]);
export const createUnitService = ({ nombre, simbolo, permiteFraccion }) => (
  getCreatedRow(createUnit, [nombre, simbolo, permiteFraccion])
);
export const createLocationService = ({ codigo, pasillo, estante }) => (
  getCreatedRow(createLocation, [codigo, pasillo, estante])
);
export const createModelService = ({ nombre, descripcion, idMarca }) => (
  getCreatedRow(createModel, [nombre, descripcion, idMarca])
);

export const updateCategoryService = (id, data) => getUpdatedRow(updateCategory, id, data);
export const updateBrandService = (id, data) => getUpdatedRow(updateBrand, id, data);
export const updateUnitService = (id, data) => getUpdatedRow(updateUnit, id, data);
export const updateModelService = (id, data) => getUpdatedRow(updateModel, id, data);

export const deleteCategoryService = (id) => deleteRow(
  deleteCategory, id, 'La categoría tiene productos asociados; reasígnalos antes de eliminarla.',
);
export const deleteBrandService = (id) => deleteRow(
  deleteBrand, id, 'La marca tiene productos o modelos asociados; elimínalos o reasígnalos antes.',
);
export const deleteUnitService = (id) => deleteRow(
  deleteUnit, id, 'La unidad de medida está en uso por productos.',
);
export const deleteModelService = (id) => deleteRow(
  deleteModel, id, 'El modelo está en uso por productos o compatibilidades.',
);

export const createProductService = async (data) => {
  try {
    return await createProduct(
      data.codigo, data.nombre, data.descripcion, data.precioVenta, data.idCategoria,
      data.idUnidadMedida, data.idUbicacion, data.idMarca, data.idModelo, data.stockMinimo,
      data.precioCompra, data.margenGanancia,
    );
  } catch (error) {
    return translateDatabaseError(error);
  }
};

export const updateProductService = async (idProducto, data) => {
  let product;
  try {
    product = await updateProduct(idProducto, data);
  } catch (error) {
    return translateDatabaseError(error);
  }
  if (!product) throw new AppError(errorCodes.NOT_FOUND);
  return product;
};

export const listAdminProductsService = async ({ buscar, idCategoria, estado, pagina, limite }) => {
  const rows = await listAdminProducts({
    buscar, idCategoria, estado, limite, desplazamiento: (pagina - 1) * limite,
  });
  const total = Number(rows[0]?.total ?? 0);
  const products = rows.map((row) => {
    const product = { ...row };
    delete product.total;
    return product;
  });
  return { products, total, pagina, limite };
};

export const createCompatibilityService = ({ idProducto, idModelo, observaciones }) => (
  getCreatedRow(createCompatibility, [idProducto, idModelo, observaciones])
);

export const deleteCompatibilityService = async (idProducto, idModelo) => {
  const result = await deleteCompatibility(idProducto, idModelo);
  if (!result.rows[0]) throw new AppError(errorCodes.NOT_FOUND);
  return result.rows[0];
};

export const listCompatibilitiesService = async (idProducto) => {
  if (!(await productExists(idProducto))) throw new AppError(errorCodes.NOT_FOUND);
  return listCompatibilities(idProducto);
};

export const getCatalogFiltersService = () => getCatalogFilters();
export const listCategoriesService = async () => (await listCategories()).rows;
export const listBrandsService = async () => (await listBrands()).rows;
export const listUnitsService = async () => (await listUnits()).rows;
export const listLocationsService = async () => (await listLocations()).rows;
export const listModelsService = async () => (await listModels()).rows;

export const getPublicProductsService = async ({ buscar, idCategoria, idMarca, idModelo, pagina, limite }) => {
  const rows = await getPublicProducts(
    buscar, idCategoria, idMarca, idModelo, limite, (pagina - 1) * limite,
  );
  const total = Number(rows[0]?.total ?? 0);
  const products = rows.map((row) => {
    const product = { ...row };
    delete product.total;
    return product;
  });
  return { products, total, pagina, limite };
};

export const getPublicProductByIdService = async (idProducto) => {
  const result = await getPublicProductById(idProducto);
  if (!result[0]) throw new AppError(errorCodes.NOT_FOUND);
  return { ...result[0], compatibilidades: await listCompatibilities(idProducto) };
};
