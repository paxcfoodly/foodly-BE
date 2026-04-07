import { Router } from 'express';
import { listCodeGroups, listCodesByGroup } from '../../../controllers/commonCodeController';

const router = Router();

/**
 * @openapi
 * /api/v1/common-codes:
 *   get:
 *     tags: [CommonCode]
 *     summary: 전체 공통코드 그룹 목록 조회
 *     responses:
 *       200:
 *         description: 공통코드 그룹 목록
 */
router.get('/', listCodeGroups);

/**
 * @openapi
 * /api/v1/common-codes/{groupCd}:
 *   get:
 *     tags: [CommonCode]
 *     summary: 특정 그룹의 상세코드 목록 조회
 *     parameters:
 *       - in: path
 *         name: groupCd
 *         required: true
 *         schema:
 *           type: string
 *         description: 그룹코드 (e.g. ITEM_TYPE)
 *     responses:
 *       200:
 *         description: 해당 그룹의 상세코드 목록
 */
router.get('/:groupCd', listCodesByGroup);

export default router;
