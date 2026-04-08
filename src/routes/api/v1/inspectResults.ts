import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listInspectResultsHandler,
  getInspectResultHandler,
  getInspectionStandardsHandler,
  createInspectResultHandler,
  deleteInspectResultHandler,
} from '../../../controllers/inspectResultController';

const inspectResultsRouter = Router();

// All routes require authentication + menu-based permission
inspectResultsRouter.use(authenticate);
inspectResultsRouter.use(requirePermission({ menuUrl: '/quality/process' }));

// Get inspection standards for a given item + type (used by FE form to populate detail rows)
inspectResultsRouter.get('/standards', getInspectionStandardsHandler);

// List inspect results (paginated + filtered + sorted)
inspectResultsRouter.get('/', listInspectResultsHandler);

// Get single inspect result
inspectResultsRouter.get('/:inspectId', getInspectResultHandler);

// Create inspect result (auto-judges each detail + updates LOT on FAIL)
inspectResultsRouter.post('/', createInspectResultHandler);

// Delete inspect result
inspectResultsRouter.delete('/:inspectId', deleteInspectResultHandler);

export default inspectResultsRouter;
