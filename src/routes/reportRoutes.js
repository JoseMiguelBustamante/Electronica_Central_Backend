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
import { validateBody, validateQuery } from '../middlewares/validateDto.js';
import { reportVoiceBodyDto } from '../dto/reportVoice.dto.js';
import { interpretarInstruccionReporte } from '../services/voiceInterpreterService.js';
import { sendError } from '../utils/sendError.js';

const reportRouter = Router();
const consultReports = [authenticate, requirePermissions('REPORTES_CONSULTAR')];

reportRouter.post('/interpretar', ...consultReports, validateBody(reportVoiceBodyDto), async (req, res) => {
  try {
    return res.status(200).json({ data: await interpretarInstruccionReporte(req.validated.body.texto) });
  } catch (error) {
    return sendError(res, error);
  }
});

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
