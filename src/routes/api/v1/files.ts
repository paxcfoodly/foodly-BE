import { Router } from 'express';
import { upload } from '../../../utils/fileUpload';
import { uploadFiles, downloadFile } from '../../../controllers/fileController';

const filesRouter = Router();

/**
 * @openapi
 * /api/v1/files/upload:
 *   post:
 *     tags: [Files]
 *     summary: 파일 업로드 (단일/다중)
 *     description: 단일 파일(file) 또는 다중 파일(files, 최대 10개)을 업로드합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               ref_table:
 *                 type: string
 *               ref_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: 업로드 성공
 *       400:
 *         description: 파일 없음 / 형식 오류
 */
filesRouter.post('/upload', upload.array('files', 10), uploadFiles);

/**
 * @openapi
 * /api/v1/files/{fileId}:
 *   get:
 *     tags: [Files]
 *     summary: 파일 다운로드
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 파일 바이너리
 *       404:
 *         description: 파일을 찾을 수 없음
 */
filesRouter.get('/:fileId', downloadFile);

export default filesRouter;
