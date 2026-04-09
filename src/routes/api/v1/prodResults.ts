import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listProdResultsHandler,
  getProdResultHandler,
  createProdResultHandler,
  updateProdResultHandler,
  deleteProdResultHandler,
} from '../../../controllers/prodResultController';

const prodResultsRouter = Router();

// All routes require authentication + menu-based permission
prodResultsRouter.use(authenticate);
prodResultsRouter.use(requirePermission({ menuUrl: '/result/manage' }));

// List production results (paginated + filtered + sorted)
prodResultsRouter.get('/', listProdResultsHandler);

// Get single production result
prodResultsRouter.get('/:resultId', getProdResultHandler);

// Create production result
prodResultsRouter.post('/', createProdResultHandler);

// Update production result
prodResultsRouter.put('/:resultId', updateProdResultHandler);

// Delete production result
prodResultsRouter.delete('/:resultId', deleteProdResultHandler);

export default prodResultsRouter;
