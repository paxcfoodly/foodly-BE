import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { upload } from '../../../utils';
import {
  listItemsHandler,
  getItemHandler,
  createItemHandler,
  updateItemHandler,
  deleteItemHandler,
  importItemsHandler,
  exportItemsHandler,
} from '../../../controllers/itemController';

const itemsRouter = Router();

// All routes require authentication + menu-based permission
itemsRouter.use(authenticate);
itemsRouter.use(requirePermission({ menuUrl: '/master/item' }));

// List items (paginated + filtered + sorted)
itemsRouter.get('/', listItemsHandler);

// Export to Excel (must be before /:itemCd to avoid matching 'export' as an itemCd)
itemsRouter.get('/export', exportItemsHandler);

// Get single item
itemsRouter.get('/:itemCd', getItemHandler);

// Create item
itemsRouter.post('/', createItemHandler);

// Update item
itemsRouter.put('/:itemCd', updateItemHandler);

// Delete item
itemsRouter.delete('/:itemCd', deleteItemHandler);

// Bulk import from Excel
itemsRouter.post('/import', upload.single('file'), importItemsHandler);

export default itemsRouter;
