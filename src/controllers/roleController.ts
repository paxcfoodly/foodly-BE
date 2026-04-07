import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../types/apiResponse';
import * as roleService from '../services/roleService';

/**
 * GET /api/v1/roles
 */
export async function listRolesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await roleService.listRoles();
    res.json(successResponse(roles));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/roles/:roleCd
 */
export async function getRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleCd = req.params.roleCd as string;
    const role = await roleService.getRoleById(roleCd);
    res.json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/roles
 */
export async function createRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role_cd, role_nm, role_desc } = req.body;
    if (!role_cd || !role_nm) {
      res.status(400).json(errorResponse('role_cd, role_nm은 필수 항목입니다.'));
      return;
    }
    const role = await roleService.createRole({
      role_cd,
      role_nm,
      role_desc,
      create_by: req.user?.loginId,
    });
    res.status(201).json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/roles/:roleCd
 */
export async function updateRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleCd = req.params.roleCd as string;
    const { role_nm, role_desc, use_yn } = req.body;
    if (use_yn !== undefined && !['Y', 'N'].includes(use_yn)) {
      res.status(400).json(errorResponse('use_yn은 Y 또는 N만 가능합니다.'));
      return;
    }
    const role = await roleService.updateRole(roleCd, {
      role_nm,
      role_desc,
      use_yn,
      update_by: req.user?.loginId,
    });
    res.json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/roles/:roleCd
 */
export async function deleteRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleCd = req.params.roleCd as string;
    const result = await roleService.deleteRole(roleCd);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/roles/:roleCd/permissions
 */
export async function setPermissionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleCd = req.params.roleCd as string;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json(errorResponse('permissions 배열이 필요합니다.'));
      return;
    }

    // Validate each permission entry
    for (const p of permissions) {
      if (!p.menu_id || typeof p.menu_id !== 'number') {
        res.status(400).json(errorResponse('각 권한에 menu_id(숫자)가 필요합니다.'));
        return;
      }
    }

    // Normalize Y/N defaults
    const normalized = permissions.map((p: any) => ({
      menu_id: p.menu_id,
      can_create: p.can_create === 'Y' ? 'Y' : 'N',
      can_read: p.can_read === 'Y' ? 'Y' : 'N',
      can_update: p.can_update === 'Y' ? 'Y' : 'N',
      can_delete: p.can_delete === 'Y' ? 'Y' : 'N',
      can_print: p.can_print === 'Y' ? 'Y' : 'N',
    }));

    const result = await roleService.setRolePermissions(roleCd, normalized, req.user?.loginId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}
