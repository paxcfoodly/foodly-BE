import prisma from '../config/database';

export interface MenuPermission {
  menuId: number;
  menuNm: string;
  menuUrl: string | null;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

// ─── In-memory permission cache (per role_cd, TTL-based) ───
interface CacheEntry {
  permissions: MenuPermission[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const permissionCache = new Map<string, CacheEntry>();

/**
 * Get all menu permissions for a role code.
 * Results are cached in-memory for 5 minutes per role.
 */
export async function getPermissionsByRole(roleCd: string): Promise<MenuPermission[]> {
  const now = Date.now();
  const cached = permissionCache.get(roleCd);
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  const roleMenus = await prisma.tbRoleMenu.findMany({
    where: { role_cd: roleCd },
    include: {
      menu: {
        select: {
          menu_id: true,
          menu_nm: true,
          menu_url: true,
          use_yn: true,
        },
      },
    },
    orderBy: { menu: { sort_order: 'asc' } },
  });

  const permissions: MenuPermission[] = roleMenus
    .filter((rm) => rm.menu?.use_yn === 'Y')
    .map((rm) => ({
      menuId: rm.menu_id,
      menuNm: rm.menu?.menu_nm ?? '',
      menuUrl: rm.menu?.menu_url ?? null,
      canCreate: rm.can_create === 'Y',
      canRead: rm.can_read === 'Y',
      canUpdate: rm.can_update === 'Y',
      canDelete: rm.can_delete === 'Y',
      canPrint: rm.can_print === 'Y',
    }));

  permissionCache.set(roleCd, { permissions, expiresAt: now + CACHE_TTL_MS });
  return permissions;
}

/**
 * Check if a role has a specific action permission on a menu (by menu URL or menu ID).
 */
export async function checkPermission(
  roleCd: string,
  action: 'create' | 'read' | 'update' | 'delete',
  menuIdentifier: { menuUrl?: string; menuId?: number },
): Promise<boolean> {
  const permissions = await getPermissionsByRole(roleCd);

  const perm = permissions.find((p) => {
    if (menuIdentifier.menuId !== undefined) return p.menuId === menuIdentifier.menuId;
    if (menuIdentifier.menuUrl) return p.menuUrl === menuIdentifier.menuUrl;
    return false;
  });

  if (!perm) return false;

  switch (action) {
    case 'create': return perm.canCreate;
    case 'read': return perm.canRead;
    case 'update': return perm.canUpdate;
    case 'delete': return perm.canDelete;
    default: return false;
  }
}

/**
 * Invalidate the permission cache for a specific role or all roles.
 */
export function invalidatePermissionCache(roleCd?: string): void {
  if (roleCd) {
    permissionCache.delete(roleCd);
  } else {
    permissionCache.clear();
  }
}
