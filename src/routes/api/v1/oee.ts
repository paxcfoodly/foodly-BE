import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  getOeeSummaryHandler,
  getOeeDetailHandler,
  getOeeTrendHandler,
  getDownReasonSummaryHandler,
} from '../../../controllers/oeeController';

const oeeRouter = Router();

oeeRouter.use(authenticate);
oeeRouter.use(requirePermission({ menuUrl: '/dashboard/equipment' }));

// Named routes must come before /:equipCd
oeeRouter.get('/summary', getOeeSummaryHandler);
oeeRouter.get('/trend', getOeeTrendHandler);
oeeRouter.get('/down-reasons', getDownReasonSummaryHandler);
oeeRouter.get('/:equipCd', getOeeDetailHandler);

export default oeeRouter;
