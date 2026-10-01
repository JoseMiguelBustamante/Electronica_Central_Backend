import { Router } from 'express';
import {
  createBrandController,
  createCategoryController,
  createCompatibilityController,
  createLocationController,
  createModelController,
  createProductController,
  createUnitController,
  deactivateProductController,
  deleteCompatibilityController,
  getCatalogFiltersController,
  getPublicProductByIdController,
  getPublicProductsController,
} from '../controllers/catalogController.js';
import {
  compatibilityParamsDto,
  createBrandDto,
  createCategoryDto,
  createCompatibilityDto,
  createLocationDto,
  createModelDto,
  createProductDto,
  createUnitDto,
  deactivateProductDto,
  productIdParamsDto,
  publicProductsQueryDto,
} from '../dto/catalog.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';

const catalogRouter = Router();
const manageCatalog = [authenticate, requirePermissions('CATALOGO_GESTIONAR')];

catalogRouter.get('/catalogo/productos', validateQuery(publicProductsQueryDto), getPublicProductsController);
catalogRouter.get('/catalogo/productos/:id', validateParams(productIdParamsDto), getPublicProductByIdController);
catalogRouter.get('/catalogo/filtros', getCatalogFiltersController);

catalogRouter.post('/categorias', ...manageCatalog, validateBody(createCategoryDto), createCategoryController);
catalogRouter.post('/marcas', ...manageCatalog, validateBody(createBrandDto), createBrandController);
catalogRouter.post('/unidades', ...manageCatalog, validateBody(createUnitDto), createUnitController);
catalogRouter.post('/ubicaciones', ...manageCatalog, validateBody(createLocationDto), createLocationController);
catalogRouter.post('/modelos', ...manageCatalog, validateBody(createModelDto), createModelController);
catalogRouter.post('/productos', ...manageCatalog, validateBody(createProductDto), createProductController);
catalogRouter.patch('/productos/:id', ...manageCatalog, validateParams(productIdParamsDto), validateBody(deactivateProductDto), deactivateProductController);
catalogRouter.post('/productos/:id/compatibilidades', ...manageCatalog, validateParams(productIdParamsDto), validateBody(createCompatibilityDto), createCompatibilityController);
catalogRouter.delete('/productos/:id/compatibilidades/:idModelo', ...manageCatalog, validateParams(compatibilityParamsDto), deleteCompatibilityController);

export default catalogRouter;
