import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listInspectStdsHandler,
  getInspectStdHandler,
  createInspectStdHandler,
  updateInspectStdHandler,
  deleteInspectStdHandler,
} from '../../../controllers/inspectStdController';

const inspectStdsRouter = Router();

// All routes require authentication + menu-based permission
inspectStdsRouter.use(authenticate);
inspectStdsRouter.use(requirePermission({ menuUrl: '/master/inspection' }));

// List inspect standards (paginated + filtered + sorted)
inspectStdsRouter.get('/', listInspectStdsHandler);

// Get single inspect standard
inspectStdsRouter.get('/:inspectStdId', getInspectStdHandler);

// Create inspect standard
inspectStdsRouter.post('/', createInspectStdHandler);

// Update inspect standard
inspectStdsRouter.put('/:inspectStdId', updateInspectStdHandler);

// Delete inspect standard
inspectStdsRouter.delete('/:inspectStdId', deleteInspectStdHandler);

export default inspectStdsRouter;
