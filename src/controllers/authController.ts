import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import * as permissionService from '../services/permissionService';
import { successResponse, errorResponse } from '../types/apiResponse';

/**
 * POST /api/v1/auth/login
 */
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      res.status(400).json(errorResponse('아이디와 비밀번호를 입력해 주세요.'));
      return;
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || undefined;

    const result = await authService.login(login_id, password, ipAddress);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json(errorResponse('리프레시 토큰이 필요합니다.'));
      return;
    }

    const result = await authService.refresh(refreshToken);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || undefined;

    await authService.logout(req.user!.userId, ipAddress);
    res.json(successResponse({ message: '로그아웃되었습니다.' }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(successResponse(profile));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/permissions
 * Returns the current user's full permission list based on their role.
 */
export async function permissionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roleCd, loginId } = req.user!;

    if (!roleCd) {
      res.json(successResponse({
        roleCd: null,
        permissions: [],
      }));
      return;
    }

    const permissions = await permissionService.getPermissionsByRole(roleCd);
    res.json(successResponse({
      roleCd,
      loginId,
      permissions,
    }));
  } catch (err) {
    next(err);
  }
}
