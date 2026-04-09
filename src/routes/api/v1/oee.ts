import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import {
  getOeeSummaryHandler,
  getOeeDetailHandler,
  getOeeTrendHandler,
  getDownReasonSummaryHandler,
} from '../../../controllers/oeeController';

const oeeRouter = Router();

oeeRouter.use(authenticate);
// requirePermission removed — OEE data is used by both /dashboard/equipment and /reports/equipment.
// Authentication alone is sufficient for read access (ASVS L1). See T-09-07.

// Named routes must come before /:equipCd
oeeRouter.get('/summary', getOeeSummaryHandler);
oeeRouter.get('/trend', getOeeTrendHandler);
oeeRouter.get('/down-reasons', getDownReasonSummaryHandler);
oeeRouter.get('/:equipCd', getOeeDetailHandler);

export default oeeRouter;
