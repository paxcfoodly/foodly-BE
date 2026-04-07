import { Router, Request, Response } from 'express';
import { successResponse } from '../types/apiResponse';
import prisma from '../config/database';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: 헬스체크 엔드포인트
 *     description: 서버 상태, DB 연결 상태, 업타임 등 시스템 상태를 반환합니다.
 *     responses:
 *       200:
 *         description: 시스템 상태 정보
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthCheck'
 */
router.get('/health', async (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json(
    successResponse({
      status: 'ok',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
    }),
  );
});

export default router;
