import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listRoutingsByItemHandler,
  bulkSetRoutingsHandler,
  createRoutingHandler,
  updateRoutingHandler,
  deleteRoutingHandler,
} from '../../../controllers/routingController';

const routingsRouter = Router();

// All routes require authentication + menu-based permission
routingsRouter.use(authenticate);
routingsRouter.use(requirePermission({ menuUrl: '/master/process' }));

// List routings by item_cd (query param)
routingsRouter.get('/', listRoutingsByItemHandler);

// Bulk set routings for an item
routingsRouter.post('/bulk', bulkSetRoutingsHandler);

// Create single routing
routingsRouter.post('/', createRoutingHandler);

// Update routing
routingsRouter.put('/:routingId', updateRoutingHandler);

// Delete routing
routingsRouter.delete('/:routingId', deleteRoutingHandler);

export default routingsRouter;
