import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listWorkersHandler,
  getWorkerHandler,
  createWorkerHandler,
  updateWorkerHandler,
  deleteWorkerHandler,
} from '../../../controllers/workerController';

const workersRouter = Router();

// All routes require authentication + menu-based permission
workersRouter.use(authenticate);
workersRouter.use(requirePermission({ menuUrl: '/master/worker' }));

// List workers (paginated + filtered + sorted)
workersRouter.get('/', listWorkersHandler);

// Get single worker
workersRouter.get('/:workerId', getWorkerHandler);

// Create worker
workersRouter.post('/', createWorkerHandler);

// Update worker
workersRouter.put('/:workerId', updateWorkerHandler);

// Delete worker
workersRouter.delete('/:workerId', deleteWorkerHandler);

export default workersRouter;
