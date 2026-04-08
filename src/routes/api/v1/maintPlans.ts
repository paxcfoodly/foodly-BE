import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  createMaintPlanHandler,
  updateMaintPlanHandler,
  getMaintPlanHandler,
  listMaintPlansHandler,
  deleteMaintPlanHandler,
  getTodayPlanCountHandler,
  getPlansForDateRangeHandler,
} from '../../../controllers/maintPlanController';

const maintPlansRouter = Router();

maintPlansRouter.use(authenticate);
maintPlansRouter.use(requirePermission({ menuUrl: '/equipment/preventive' }));

// Named routes MUST come before /:id to avoid matching as id
maintPlansRouter.get('/today-count', getTodayPlanCountHandler);
maintPlansRouter.get('/calendar', getPlansForDateRangeHandler);
maintPlansRouter.get('/', listMaintPlansHandler);
maintPlansRouter.get('/:id', getMaintPlanHandler);
maintPlansRouter.post('/', createMaintPlanHandler);
maintPlansRouter.put('/:id', updateMaintPlanHandler);
maintPlansRouter.delete('/:id', deleteMaintPlanHandler);

export default maintPlansRouter;
