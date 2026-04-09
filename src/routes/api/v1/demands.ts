import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listDemandsHandler,
  getDemandHandler,
  createDemandHandler,
  updateDemandHandler,
  deleteDemandHandler,
  createDraftPlanHandler,
} from '../../../controllers/demandController';

const demandsRouter = Router();

// All routes require authentication + menu-based permission
demandsRouter.use(authenticate);
demandsRouter.use(requirePermission({ menuUrl: '/plan/demand' }));

// List demands (paginated + filtered + sorted)
demandsRouter.get('/', listDemandsHandler);

// Create draft plan from demand (before /:demandId to avoid param clash)
demandsRouter.post('/:demandId/create-plan', createDraftPlanHandler);

// Get single demand
demandsRouter.get('/:demandId', getDemandHandler);

// Create demand
demandsRouter.post('/', createDemandHandler);

// Update demand
demandsRouter.put('/:demandId', updateDemandHandler);

// Delete demand
demandsRouter.delete('/:demandId', deleteDemandHandler);

export default demandsRouter;
