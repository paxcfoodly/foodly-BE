import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listMoldsHandler,
  getMoldHandler,
  createMoldHandler,
  updateMoldHandler,
  deleteMoldHandler,
  importMoldsHandler,
  exportMoldsHandler,
} from '../../../controllers/moldController';

const moldsRouter = Router();

// All routes require authentication + menu-based permission
moldsRouter.use(authenticate);
moldsRouter.use(requirePermission({ menuUrl: '/equipment/mold' }));

// List molds (paginated + filtered + sorted)
moldsRouter.get('/', listMoldsHandler);

// Export to Excel (must be before /:moldCd to avoid matching 'export' as a moldCd)
moldsRouter.get('/export', exportMoldsHandler);

// Get single mold
moldsRouter.get('/:moldCd', getMoldHandler);

// Create mold
moldsRouter.post('/', createMoldHandler);

// Update mold
moldsRouter.put('/:moldCd', updateMoldHandler);

// Delete mold
moldsRouter.delete('/:moldCd', deleteMoldHandler);

// Bulk import from Excel
moldsRouter.post('/import', upload.single('file'), importMoldsHandler);

export default moldsRouter;
