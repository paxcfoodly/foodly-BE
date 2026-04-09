import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listInventoryHandler,
  adjustInventoryHandler,
} from '../../../controllers/inventoryController';

const inventoryRouter = Router();

// All routes require authentication + menu-based permission
inventoryRouter.use(authenticate);
inventoryRouter.use(requirePermission({ menuUrl: '/inventory/stock' }));

// List inventory (paginated + filtered + sorted)
inventoryRouter.get('/', listInventoryHandler);

// Adjust inventory
inventoryRouter.post('/adjust', adjustInventoryHandler);

export default inventoryRouter;
