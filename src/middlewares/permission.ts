import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../types/apiResponse';
import { checkPermission } from '../services/permissionService';

type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * Map HTTP methods to CRUD actions.
 */
function httpMethodToAction(method: string): Action {
  switch (method.toUpperCase()) {
    case 'POST':   return 'create';
    case 'PUT':    return 'update';
    case 'PATCH':  return 'update';
    case 'DELETE': return 'delete';
    default:       return 'read'; // GET, HEAD, OPTIONS
  }
}

/**
 * Permission middleware factory — checks if the authenticated user's role
 * has the required action permission for the specified menu.
 *
 * Usage patterns:
 *   1. Explicit: requirePermission('create', { menuUrl: '/production/plan' })
 *   2. Explicit with menu ID: requirePermission('read', { menuId: 3 })
 *   3. Auto-detect action from HTTP method: requirePermission({ menuUrl: '/production/plan' })
 */
export function requirePermission(
  actionOrMenu: Action | { menuUrl?: string; menuId?: number },
  menuIdentifier?: { menuUrl?: string; menuId?: number },
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Must be authenticated first (req.user set by authenticate middleware)
    if (!req.user) {
      res.status(401).json(errorResponse('인증이 필요합니다.'));
      return;
    }

    const { roleCd } = req.user;

    // No role assigned — deny access
    if (!roleCd) {
      res.status(403).json(errorResponse('역할이 할당되지 않은 사용자입니다.'));
      return;
    }

    // Resolve action and menu
    let action: Action;
    let menu: { menuUrl?: string; menuId?: number };

    if (typeof actionOrMenu === 'string') {
      action = actionOrMenu;
      menu = menuIdentifier ?? {};
    } else {
      action = httpMethodToAction(req.method);
      menu = actionOrMenu;
    }

    try {
      const allowed = await checkPermission(roleCd, action, menu);

      if (!allowed) {
        console.warn(
          `[RBAC] Denied: user=${req.user.loginId} role=${roleCd} action=${action} menu=${JSON.stringify(menu)}`,
        );
        res.status(403).json(errorResponse('해당 기능에 대한 권한이 없습니다.'));
        return;
      }

      next();
    } catch (err) {
      console.error('[RBAC] Permission check failed:', err);
      next(err);
    }
  };
}

/**
 * Middleware that allows only specific roles (whitelist).
 * Useful for admin-only endpoints where menu-based RBAC doesn't apply.
 *
 * Usage: requireRole('SYS_ADMIN')
 *        requireRole('SYS_ADMIN', 'PLANT_MGR')
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('인증이 필요합니다.'));
      return;
    }

    const { roleCd } = req.user;

    if (!roleCd || !allowedRoles.includes(roleCd)) {
      console.warn(
        `[RBAC] Role denied: user=${req.user.loginId} role=${roleCd} required=${allowedRoles.join(',')}`,
      );
      res.status(403).json(errorResponse('해당 기능에 대한 권한이 없습니다.'));
      return;
    }

    next();
  };
}
