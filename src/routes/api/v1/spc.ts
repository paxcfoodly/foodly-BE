import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { requirePermission } from '../../../middlewares/permission';
import { getSpcDataHandler, getSpcInspectStdsHandler } from '../../../controllers/spcController';

const spcRouter = Router();

// All routes require authentication + menu-based permission
spcRouter.use(authenticate);
spcRouter.use(requirePermission({ menuUrl: '/quality/spc' }));

// GET /spc/xbar-r?inspect_std_id=X&subgroup_size=5&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
spcRouter.get('/xbar-r', getSpcDataHandler);

// GET /spc/inspect-stds?item_cd=X
spcRouter.get('/inspect-stds', getSpcInspectStdsHandler);

export default spcRouter;
