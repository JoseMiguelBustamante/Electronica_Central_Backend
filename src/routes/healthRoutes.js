import { Router } from 'express';
import { getHealthController, getReadinessController } from '../controllers/healthController.js';

const healthRouter = Router();

healthRouter.get('/health', getHealthController);
healthRouter.get('/ready', getReadinessController);

export default healthRouter;
