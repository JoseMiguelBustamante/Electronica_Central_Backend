import { Router } from 'express';
import {
  createBrandController,
  createCategoryController,
  createCompatibilityController,
  createLocationController,
  createModelController,
  createProductController,
  createUnitController,
  deleteBrandController,
  deleteCategoryController,
  deleteCompatibilityController,
  deleteModelController,
  deleteUnitController,
  getCatalogFiltersController,
  getPublicProductByIdController,
  getPublicProductsController,
  listAdminProductsController,
  listBrandsController,
  listCategoriesController,
  listCompatibilitiesController,
  listLocationsController,
  listModelsController,
  listUnitsController,
  updateBrandController,
  updateCategoryController,
  updateModelController,
  updateProductController,
  updateUnitController,
} from '../controllers/catalogController.js';
import {
  adminProductsQueryDto,
  catalogIdParamsDto,
  compatibilityParamsDto,
  createBrandDto,
  createCategoryDto,
  createCompatibilityDto,
  createLocationDto,
  createModelDto,
  createProductDto,
  createUnitDto,
  productIdParamsDto,
  publicProductsQueryDto,
  updateBrandDto,
  updateCategoryDto,
  updateModelDto,
  updateProductDto,
  updateUnitDto,
} from '../dto/catalog.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const catalogRouter = Router();
const manageCatalog = [authenticate, requirePermissions('CATALOGO_GESTIONAR')];
const byId = validateParams(catalogIdParamsDto);

catalogRouter.get('/catalogo/productos', validateQuery(publicProductsQueryDto), getPublicProductsController);
catalogRouter.get('/catalogo/productos/:id', validateParams(productIdParamsDto), getPublicProductByIdController);
catalogRouter.get('/catalogo/filtros', getCatalogFiltersController);

catalogRouter.get('/categorias', ...manageCatalog, listCategoriesController);
catalogRouter.get('/marcas', ...manageCatalog, listBrandsController);
catalogRouter.get('/unidades', ...manageCatalog, listUnitsController);
catalogRouter.get('/ubicaciones', ...manageCatalog, listLocationsController);
catalogRouter.get('/modelos', ...manageCatalog, listModelsController);
catalogRouter.post('/categorias', ...manageCatalog, validateBody(createCategoryDto), createCategoryController);
catalogRouter.post('/marcas', ...manageCatalog, validateBody(createBrandDto), createBrandController);
catalogRouter.post('/unidades', ...manageCatalog, validateBody(createUnitDto), createUnitController);
catalogRouter.post('/ubicaciones', ...manageCatalog, validateBody(createLocationDto), createLocationController);
catalogRouter.post('/modelos', ...manageCatalog, validateBody(createModelDto), createModelController);
catalogRouter.patch('/categorias/:id', ...manageCatalog, byId, validateBody(updateCategoryDto), updateCategoryController);
catalogRouter.patch('/marcas/:id', ...manageCatalog, byId, validateBody(updateBrandDto), updateBrandController);
catalogRouter.patch('/unidades/:id', ...manageCatalog, byId, validateBody(updateUnitDto), updateUnitController);
catalogRouter.patch('/modelos/:id', ...manageCatalog, byId, validateBody(updateModelDto), updateModelController);
catalogRouter.delete('/categorias/:id', ...manageCatalog, byId, deleteCategoryController);
catalogRouter.delete('/marcas/:id', ...manageCatalog, byId, deleteBrandController);
catalogRouter.delete('/unidades/:id', ...manageCatalog, byId, deleteUnitController);
catalogRouter.delete('/modelos/:id', ...manageCatalog, byId, deleteModelController);

catalogRouter.get('/productos', ...manageCatalog, validateQuery(adminProductsQueryDto), listAdminProductsController);
catalogRouter.post('/productos', ...manageCatalog, validateBody(createProductDto), createProductController);
catalogRouter.patch('/productos/:id', ...manageCatalog, validateParams(productIdParamsDto), validateBody(updateProductDto), updateProductController);
catalogRouter.get('/productos/:id/compatibilidades', ...manageCatalog, validateParams(productIdParamsDto), listCompatibilitiesController);
catalogRouter.post('/productos/:id/compatibilidades', ...manageCatalog, validateParams(productIdParamsDto), validateBody(createCompatibilityDto), createCompatibilityController);
catalogRouter.delete('/productos/:id/compatibilidades/:idModelo', ...manageCatalog, validateParams(compatibilityParamsDto), deleteCompatibilityController);

export default catalogRouter;
