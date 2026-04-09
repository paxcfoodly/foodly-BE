import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  getProductionDailyHandler,
  getProductionSummaryHandler,
  getQualityParetoHandler,
  getQualityByProcessHandler,
  getQualityTrendHandler,
  getQualityDetailHandler,
  getInventorySummaryHandler,
} from '../../../controllers/reportsController';

const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requirePermission({ menuUrl: '/reports' }));

reportsRouter.get('/production/daily', getProductionDailyHandler);
reportsRouter.get('/production/summary', getProductionSummaryHandler);
reportsRouter.get('/quality/pareto', getQualityParetoHandler);
reportsRouter.get('/quality/by-process', getQualityByProcessHandler);
reportsRouter.get('/quality/trend', getQualityTrendHandler);
reportsRouter.get('/quality/detail', getQualityDetailHandler);
reportsRouter.get('/inventory/summary', getInventorySummaryHandler);

export default reportsRouter;
