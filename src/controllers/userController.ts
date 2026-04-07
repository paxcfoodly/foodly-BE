import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';
import { parseSort } from '../utils/sorting';
import { parseFilters } from '../utils/filters';
import * as userService from '../services/userService';

const ALLOWED_SORT_FIELDS = ['user_id', 'login_id', 'user_nm', 'status', 'create_dt', 'update_dt'];
const ALLOWED_FILTER_FIELDS = ['login_id', 'user_nm', 'role_cd', 'company_cd', 'status'];

/**
 * POST /api/v1/users
 * @openapi
 * /api/v1/users:
 *   post:
 *     tags: [사용자관리]
 *     summary: 사용자 등록
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login_id, password, user_nm]
 *             properties:
 *               login_id:
 *                 type: string
 *                 example: "newuser01"
 *               password:
 *                 type: string
 *                 example: "password123!"
 *               user_nm:
 *                 type: string
 *                 example: "김신규"
 *               role_cd:
 *                 type: string
 *                 nullable: true
 *                 example: "OPERATOR"
 *               company_cd:
 *                 type: string
 *                 nullable: true
 *                 example: "COMP001"
 *     responses:
 *       201:
 *         description: 등록 성공
 *       400:
 *         description: 유효성 검증 실패
 *       409:
 *         description: 중복 로그인 ID
 */
export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { login_id, password, user_nm, role_cd, company_cd } = req.body;

    if (!login_id || !password || !user_nm) {
      res.status(400).json(errorResponse('login_id, password, user_nm은 필수 항목입니다.'));
      return;
    }

    if (password.length < 6) {
      res.status(400).json(errorResponse('비밀번호는 최소 6자 이상이어야 합니다.'));
      return;
    }

    const user = await userService.createUser({
      login_id,
      password,
      user_nm,
      role_cd: role_cd || null,
      company_cd: company_cd || null,
      create_by: req.user?.loginId,
    });

    res.status(201).json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [사용자관리]
 *     summary: 사용자 목록 조회 (페이징/검색/정렬)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: "정렬 (예: user_nm:asc,create_dt:desc)"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "통합 검색 (login_id, user_nm)"
 *     responses:
 *       200:
 *         description: 목록 조회 성공
 */
export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req);
    const orderBy = parseSort(req, ALLOWED_SORT_FIELDS);
    const filters = parseFilters(req, ALLOWED_FILTER_FIELDS);

    // Support ?search=keyword for integrated search (login_id OR user_nm)
    const search = req.query.search as string | undefined;
    let where: Record<string, unknown> = { ...filters };
    if (search && search.trim()) {
      where = {
        ...where,
        OR: [
          { login_id: { contains: search, mode: 'insensitive' } },
          { user_nm: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const result = await userService.listUsers({
      ...pagination,
      where,
      orderBy,
    });

    const paginated = buildPaginatedResponse(result.users, result.total, result.page, result.limit);
    res.json(successResponse(paginated.data, paginated.pagination));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:id
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [사용자관리]
 *     summary: 사용자 상세 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 조회 성공
 *       404:
 *         description: 사용자 없음
 */
export async function getUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json(errorResponse('유효하지 않은 사용자 ID입니다.'));
      return;
    }

    const user = await userService.getUserById(userId);
    res.json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id
 * @openapi
 * /api/v1/users/{id}:
 *   put:
 *     tags: [사용자관리]
 *     summary: 사용자 수정
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_nm:
 *                 type: string
 *               role_cd:
 *                 type: string
 *                 nullable: true
 *               company_cd:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 사용자 없음
 */
export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json(errorResponse('유효하지 않은 사용자 ID입니다.'));
      return;
    }

    const { user_nm, role_cd, company_cd, status } = req.body;

    // Validate status if provided
    if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json(errorResponse('status는 ACTIVE 또는 INACTIVE만 가능합니다.'));
      return;
    }

    const user = await userService.updateUser(userId, {
      user_nm,
      role_cd,
      company_cd,
      status,
      update_by: req.user?.loginId,
    });

    res.json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/users/:id
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [사용자관리]
 *     summary: 사용자 삭제 (논리 삭제)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공 (상태 INACTIVE로 변경)
 *       404:
 *         description: 사용자 없음
 */
export async function deleteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json(errorResponse('유효하지 않은 사용자 ID입니다.'));
      return;
    }

    const user = await userService.deleteUser(userId, req.user?.loginId);
    res.json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users/:id/reset-password
 * @openapi
 * /api/v1/users/{id}/reset-password:
 *   post:
 *     tags: [사용자관리]
 *     summary: 비밀번호 초기화
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_password:
 *                 type: string
 *                 description: "미입력 시 기본 비밀번호(foodly1234!)로 초기화"
 *     responses:
 *       200:
 *         description: 비밀번호 초기화 성공
 *       404:
 *         description: 사용자 없음
 */
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json(errorResponse('유효하지 않은 사용자 ID입니다.'));
      return;
    }

    const { new_password } = req.body || {};

    if (new_password && new_password.length < 6) {
      res.status(400).json(errorResponse('비밀번호는 최소 6자 이상이어야 합니다.'));
      return;
    }

    const result = await userService.resetPassword(userId, new_password, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
