import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler, meHandler, permissionsHandler } from '../../../controllers/authController';
import { authenticate } from '../../../middlewares/auth';

const authRouter = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 로그인
 *     description: 아이디/비밀번호로 인증 후 JWT 토큰을 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login_id, password]
 *             properties:
 *               login_id:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: 로그인 성공 — accessToken + refreshToken 반환
 *       401:
 *         description: 아이디 또는 비밀번호 불일치
 */
authRouter.post('/login', loginHandler);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 토큰 갱신
 *     description: 리프레시 토큰으로 새 액세스 토큰을 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 새 accessToken + refreshToken 반환
 *       401:
 *         description: 유효하지 않은 리프레시 토큰
 */
authRouter.post('/refresh', refreshHandler);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 로그아웃
 *     description: 로그아웃 처리 및 감사 로그를 기록합니다.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       401:
 *         description: 인증 필요
 */
authRouter.post('/logout', authenticate, logoutHandler);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: 현재 사용자 정보
 *     description: 현재 인증된 사용자의 프로필 및 권한 정보를 반환합니다.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 프로필 + 권한 목록
 *       401:
 *         description: 인증 필요
 */
authRouter.get('/me', authenticate, meHandler);

/**
 * @openapi
 * /api/v1/auth/permissions:
 *   get:
 *     tags: [Auth]
 *     summary: 현재 사용자 권한 목록
 *     description: 현재 인증된 사용자의 역할에 따른 메뉴별 CRUD 권한 목록을 반환합니다.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 역할 코드 + 메뉴별 권한 목록
 *       401:
 *         description: 인증 필요
 */
authRouter.get('/permissions', authenticate, permissionsHandler);

export default authRouter;
