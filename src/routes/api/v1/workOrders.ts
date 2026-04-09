import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listWorkOrdersHandler,
  getWorkOrderHandler,
  createWorkOrderHandler,
  updateWorkOrderHandler,
  deleteWorkOrderHandler,
  changeStatusHandler,
  splitHandler,
  downloadPdfHandler,
  getAssignmentsHandler,
  assignWorkersHandler,
  unassignWorkerHandler,
  getWorkerAvailabilityHandler,
} from '../../../controllers/workOrderController';

const workOrdersRouter = Router();

// All routes require authentication + menu-based permission
workOrdersRouter.use(authenticate);
workOrdersRouter.use(requirePermission({ menuUrl: '/work-order/management' }));

// List work orders (paginated + filtered + sorted)
workOrdersRouter.get('/', listWorkOrdersHandler);

// Worker availability check (before /:woId/workers to avoid param clash with specificity)
workOrdersRouter.get('/:woId/workers/availability', getWorkerAvailabilityHandler);

// Worker assignments
workOrdersRouter.get('/:woId/workers', getAssignmentsHandler);
workOrdersRouter.post('/:woId/workers', assignWorkersHandler);
workOrdersRouter.delete('/:woId/workers/:workerId', unassignWorkerHandler);

// Split work order (before /:woId to avoid param clash)
workOrdersRouter.post('/:woId/split', splitHandler);

// Download PDF
workOrdersRouter.get('/:woId/pdf', downloadPdfHandler);

// Change status action (before /:woId to avoid param clash)
workOrdersRouter.patch('/:woId/status', changeStatusHandler);

// Get single work order
workOrdersRouter.get('/:woId', getWorkOrderHandler);

// Create work order
workOrdersRouter.post('/', createWorkOrderHandler);

// Update work order
workOrdersRouter.put('/:woId', updateWorkOrderHandler);

// Delete work order
workOrdersRouter.delete('/:woId', deleteWorkOrderHandler);

export default workOrdersRouter;
