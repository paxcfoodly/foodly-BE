import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listMaterialIssuesHandler,
  getMaterialIssueHandler,
  createMaterialIssueHandler,
  updateMaterialIssueHandler,
  deleteMaterialIssueHandler,
  processMaterialIssueHandler,
} from '../../../controllers/materialIssueController';

const materialIssuesRouter = Router();

// All routes require authentication + menu-based permission
materialIssuesRouter.use(authenticate);
materialIssuesRouter.use(requirePermission({ menuUrl: '/inventory/issue' }));

// List material issues (paginated + filtered + sorted)
materialIssuesRouter.get('/', listMaterialIssuesHandler);

// Process material issue (status transition: REQUESTED → ISSUED)
materialIssuesRouter.patch('/:issueId/process', processMaterialIssueHandler);

// Get single material issue
materialIssuesRouter.get('/:issueId', getMaterialIssueHandler);

// Create material issue
materialIssuesRouter.post('/', createMaterialIssueHandler);

// Update material issue
materialIssuesRouter.put('/:issueId', updateMaterialIssueHandler);

// Delete material issue
materialIssuesRouter.delete('/:issueId', deleteMaterialIssueHandler);

export default materialIssuesRouter;
