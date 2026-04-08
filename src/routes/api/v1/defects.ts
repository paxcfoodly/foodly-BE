import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listDefectsHandler,
  getDefectHandler,
  createDefectHandler,
  updateDefectHandler,
  deleteDefectHandler,
  listDisposalsHandler,
  createDisposalHandler,
} from '../../../controllers/defectController';

const defectsRouter = Router();

// All routes require authentication + menu-based permission
defectsRouter.use(authenticate);
defectsRouter.use(requirePermission({ menuUrl: '/quality/defect' }));

// List defects (paginated + filtered + sorted)
defectsRouter.get('/', listDefectsHandler);

// Get single defect with disposals
defectsRouter.get('/:defectId', getDefectHandler);

// Create defect
defectsRouter.post('/', createDefectHandler);

// Update defect (only when REGISTERED)
defectsRouter.put('/:defectId', updateDefectHandler);

// Delete defect (only when REGISTERED)
defectsRouter.delete('/:defectId', deleteDefectHandler);

// List disposals for a defect
defectsRouter.get('/:defectId/disposals', listDisposalsHandler);

// Create disposal (transitions defect status)
defectsRouter.post('/:defectId/disposals', createDisposalHandler);

export default defectsRouter;
