import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listProdPlansHandler,
  getProdPlanHandler,
  createProdPlanHandler,
  updateProdPlanHandler,
  deleteProdPlanHandler,
  materialCheckHandler,
  confirmPlanHandler,
} from '../../../controllers/prodPlanController';

const prodPlansRouter = Router();

// All routes require authentication + menu-based permission
prodPlansRouter.use(authenticate);
prodPlansRouter.use(requirePermission({ menuUrl: '/plan/management' }));

// List prod plans (paginated + filtered + sorted)
prodPlansRouter.get('/', listProdPlansHandler);

// Material availability check (before /:planId to avoid param clash)
prodPlansRouter.get('/:planId/material-check', materialCheckHandler);

// Confirm plan action
prodPlansRouter.patch('/:planId/confirm', confirmPlanHandler);

// Get single prod plan
prodPlansRouter.get('/:planId', getProdPlanHandler);

// Create prod plan
prodPlansRouter.post('/', createProdPlanHandler);

// Update prod plan
prodPlansRouter.put('/:planId', updateProdPlanHandler);

// Delete prod plan
prodPlansRouter.delete('/:planId', deleteProdPlanHandler);

export default prodPlansRouter;
