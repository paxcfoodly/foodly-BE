import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  getProductionDailyHandler,
  getProductionSummaryHandler,
} from '../../../controllers/reportsController';

const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requirePermission({ menuUrl: '/reports' }));

reportsRouter.get('/production/daily', getProductionDailyHandler);
reportsRouter.get('/production/summary', getProductionSummaryHandler);

export default reportsRouter;
