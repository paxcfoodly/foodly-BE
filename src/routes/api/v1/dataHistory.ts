import { Router } from 'express';
import { queryDataHistory } from '../../../controllers/dataHistoryController';

const router = Router();

/**
 * @openapi
 * /api/v1/data-history:
 *   get:
 *     tags: [DataHistory]
 *     summary: 데이터 변경이력 조회
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: 테이블명 (e.g. TB_ITEM)
 *       - in: query
 *         name: recordId
 *         schema:
 *           type: string
 *         description: 레코드 ID (선택)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 변경이력 목록
 */
router.get('/', queryDataHistory);

export default router;
