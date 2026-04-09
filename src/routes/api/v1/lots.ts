import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import {
  listLotsHandler,
  getLotHandler,
  forwardTraceHandler,
  backwardTraceHandler,
  splitLotHandler,
  mergeLotsHandler,
  updateLotStatusHandler,
} from '../../../controllers/lotController';

const lotsRouter = Router();

// All routes require authentication + menu-based permission
lotsRouter.use(authenticate);
lotsRouter.use(requirePermission({ menuUrl: '/result/lot' }));

// List LOTs (paginated + filtered + sorted)
lotsRouter.get('/', listLotsHandler);

// Merge LOTs (POST before /:lotNo to avoid route conflict)
lotsRouter.post('/merge', mergeLotsHandler);

// Get single LOT
lotsRouter.get('/:lotNo', getLotHandler);

// Forward trace
lotsRouter.get('/:lotNo/trace/forward', forwardTraceHandler);

// Backward trace
lotsRouter.get('/:lotNo/trace/backward', backwardTraceHandler);

// Split LOT
lotsRouter.post('/:lotNo/split', splitLotHandler);

// Update LOT status
lotsRouter.patch('/:lotNo/status', updateLotStatusHandler);

export default lotsRouter;
