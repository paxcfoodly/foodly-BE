import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listWorkshopsHandler,
  getWorkshopHandler,
  createWorkshopHandler,
  updateWorkshopHandler,
  deleteWorkshopHandler,
  importWorkshopsHandler,
  exportWorkshopsHandler,
} from '../../../controllers/workshopController';

const workshopsRouter = Router();

// All routes require authentication + menu-based permission
workshopsRouter.use(authenticate);
workshopsRouter.use(requirePermission({ menuUrl: '/master/workplace' }));

// List workshops (paginated + filtered + sorted)
workshopsRouter.get('/', listWorkshopsHandler);

// Export to Excel (must be before /:workshopCd to avoid matching 'export' as a workshopCd)
workshopsRouter.get('/export', exportWorkshopsHandler);

// Get single workshop
workshopsRouter.get('/:workshopCd', getWorkshopHandler);

// Create workshop
workshopsRouter.post('/', createWorkshopHandler);

// Update workshop
workshopsRouter.put('/:workshopCd', updateWorkshopHandler);

// Delete workshop
workshopsRouter.delete('/:workshopCd', deleteWorkshopHandler);

// Bulk import from Excel
workshopsRouter.post('/import', upload.single('file'), importWorkshopsHandler);

export default workshopsRouter;
