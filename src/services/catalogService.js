import { errorCodes } from '../config/errorCodes.js';
import {
  createBrand,
  createCategory,
  createCompatibility,
  createLocation,
  createModel,
  createProduct,
  createUnit,
  deactivateProduct,
  deleteCompatibility,
  getCatalogFilters,
  getPublicProductById,
  getPublicProducts,
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
  throw error;
};

const getCreatedRow = async (repository, parameters) => {
  try {
    return (await repository(...parameters)).rows[0];
  } catch (error) {
    return translateDatabaseError(error);
  }
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

export const createProductService = async (data) => {
  try {
    return await createProduct(
      data.codigo, data.nombre, data.descripcion, data.precioVenta, data.idCategoria,
      data.idUnidadMedida, data.idUbicacion, data.idMarca, data.idModelo, data.stockMinimo,
    );
  } catch (error) {
    return translateDatabaseError(error);
  }
};

export const deactivateProductService = async (idProducto) => {
  const result = await deactivateProduct(idProducto);
  if (!result.rows[0]) throw new AppError(errorCodes.NOT_FOUND);
  return result.rows[0];
};

export const createCompatibilityService = ({ idProducto, idModelo, observaciones }) => (
  getCreatedRow(createCompatibility, [idProducto, idModelo, observaciones])
);

export const deleteCompatibilityService = async (idProducto, idModelo) => {
  const result = await deleteCompatibility(idProducto, idModelo);
  if (!result.rows[0]) throw new AppError(errorCodes.NOT_FOUND);
  return result.rows[0];
};

export const getCatalogFiltersService = () => getCatalogFilters();

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
  return result[0];
};
