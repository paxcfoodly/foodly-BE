import { Router } from 'express';
import authRouter from './auth';
import filesRouter from './files';
import excelRouter from './excel';
import commonCodesRouter from './commonCodes';
import commonCodesAdminRouter from './commonCodesAdmin';
import dataHistoryRouter from './dataHistory';
import usersRouter from './users';
import rolesRouter from './roles';
import auditLogsRouter from './auditLogs';
import noticesRouter from './notices';
import itemsRouter from './items';
import bomsRouter from './boms';
import processesRouter from './processes';
import routingsRouter from './routings';
import equipmentsRouter from './equipments';
import moldsRouter from './molds';
import workshopsRouter from './workshops';
import workersRouter from './workers';
import customersRouter from './customers';
import inspectStdsRouter from './inspectStds';
import prodPlansRouter from './prodPlans';
import workOrdersRouter from './workOrders';

const v1Router = Router();

/**
 * @openapi
 * /api/v1:
 *   get:
 *     tags: [System]
 *     summary: API v1 루트
 *     description: API v1 버전 정보를 반환합니다.
 *     responses:
 *       200:
 *         description: API 버전 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
v1Router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      version: 'v1',
      status: 'active',
    },
    error: null,
  });
});

// Domain routers
v1Router.use('/auth', authRouter);
v1Router.use('/files', filesRouter);
v1Router.use('/excel', excelRouter);
v1Router.use('/common-codes', commonCodesRouter);
v1Router.use('/data-history', dataHistoryRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/roles', rolesRouter);
v1Router.use('/common-codes-admin', commonCodesAdminRouter);
v1Router.use('/audit-logs', auditLogsRouter);
v1Router.use('/notices', noticesRouter);
v1Router.use('/items', itemsRouter);
v1Router.use('/boms', bomsRouter);
v1Router.use('/processes', processesRouter);
v1Router.use('/routings', routingsRouter);
v1Router.use('/equipments', equipmentsRouter);
v1Router.use('/molds', moldsRouter);
v1Router.use('/workshops', workshopsRouter);
v1Router.use('/workers', workersRouter);
v1Router.use('/customers', customersRouter);
v1Router.use('/inspect-stds', inspectStdsRouter);
v1Router.use('/prod-plans', prodPlansRouter);
v1Router.use('/work-orders', workOrdersRouter);
// v1Router.use('/production', productionRouter);
// v1Router.use('/quality', qualityRouter);
// v1Router.use('/inventory', inventoryRouter);

export default v1Router;
