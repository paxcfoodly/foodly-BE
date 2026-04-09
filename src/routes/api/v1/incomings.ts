import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listIncomingsHandler,
  getIncomingHandler,
  createIncomingHandler,
  updateIncomingHandler,
  deleteIncomingHandler,
  confirmIncomingHandler,
} from '../../../controllers/incomingController';

const incomingsRouter = Router();

// All routes require authentication + menu-based permission
incomingsRouter.use(authenticate);
incomingsRouter.use(requirePermission({ menuUrl: '/inventory/receive' }));

// List incomings (paginated + filtered + sorted)
incomingsRouter.get('/', listIncomingsHandler);

// Confirm incoming (status transition: PLAN → CONFIRMED)
incomingsRouter.patch('/:incomingId/confirm', confirmIncomingHandler);

// Get single incoming
incomingsRouter.get('/:incomingId', getIncomingHandler);

// Create incoming
incomingsRouter.post('/', createIncomingHandler);

// Update incoming
incomingsRouter.put('/:incomingId', updateIncomingHandler);

// Delete incoming
incomingsRouter.delete('/:incomingId', deleteIncomingHandler);

export default incomingsRouter;
