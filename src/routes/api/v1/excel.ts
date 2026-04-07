import { Router } from 'express';
import { excelExport } from '../../../controllers/excelController';

const excelRouter = Router();

/**
 * @openapi
 * /api/v1/excel/export:
 *   post:
 *     tags: [Excel]
 *     summary: 엑셀 내보내기
 *     description: columns/data를 받아 .xlsx 파일을 스트림 응답으로 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [columns, data]
 *             properties:
 *               columns:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     header:
 *                       type: string
 *                     key:
 *                       type: string
 *                     width:
 *                       type: number
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: Excel 파일 (.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 *       400:
 *         description: 잘못된 요청
 */
excelRouter.post('/export', excelExport);

export default excelRouter;
