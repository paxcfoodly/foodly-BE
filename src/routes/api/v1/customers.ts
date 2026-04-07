import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listCustomersHandler,
  getCustomerHandler,
  createCustomerHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
} from '../../../controllers/customerController';

const customersRouter = Router();

// All routes require authentication + menu-based permission
customersRouter.use(authenticate);
customersRouter.use(requirePermission({ menuUrl: '/master/vendor' }));

// List customers (paginated + filtered + sorted)
customersRouter.get('/', listCustomersHandler);

// Get single customer
customersRouter.get('/:custCd', getCustomerHandler);

// Create customer
customersRouter.post('/', createCustomerHandler);

// Update customer
customersRouter.put('/:custCd', updateCustomerHandler);

// Delete customer
customersRouter.delete('/:custCd', deleteCustomerHandler);

export default customersRouter;
