import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  createMaintResultHandler,
  listMaintResultsHandler,
  getMaintResultHandler,
  deleteMaintResultHandler,
} from '../../../controllers/maintResultController';

const maintResultsRouter = Router();

maintResultsRouter.use(authenticate);
maintResultsRouter.use(requirePermission({ menuUrl: '/equipment/preventive' }));

maintResultsRouter.get('/', listMaintResultsHandler);
maintResultsRouter.get('/:id', getMaintResultHandler);
maintResultsRouter.post('/', createMaintResultHandler);
maintResultsRouter.delete('/:id', deleteMaintResultHandler);

export default maintResultsRouter;
