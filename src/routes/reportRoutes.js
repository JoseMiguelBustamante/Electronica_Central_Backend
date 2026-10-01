import { Router } from 'express';
import {
  reportGananciasController,
  reportInventarioController,
  reportRotacionController,
  reportVentasController,
} from '../controllers/reportController.js';
import {
  reportInventarioQueryDto,
  reportPeriodQueryDto,
  reportVentasQueryDto,
} from '../dto/report.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermissions } from '../middlewares/authorizationMiddleware.js';
import { validateQuery } from '../middlewares/validateDto.js';

const reportRouter = Router();
const consultReports = [authenticate, requirePermissions('REPORTES_CONSULTAR')];

reportRouter.get('/ventas', ...consultReports, validateQuery(reportVentasQueryDto), reportVentasController);
reportRouter.get('/ganancias', ...consultReports, validateQuery(reportPeriodQueryDto), reportGananciasController);
reportRouter.get('/inventario', ...consultReports, validateQuery(reportInventarioQueryDto), reportInventarioController);
reportRouter.get(
  '/rotacion-demanda',
  ...consultReports,
  validateQuery(reportPeriodQueryDto),
  reportRotacionController,
);

export default reportRouter;
