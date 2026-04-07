import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { invalidatePermissionCache } from './permissionService';

const roleSelectFields = {
  role_cd: true,
  role_nm: true,
  role_desc: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

// ─── Role CRUD ───

export async function listRoles() {
  const roles = await prisma.tbRole.findMany({
    select: {
      ...roleSelectFields,
      _count: { select: { users: true, role_menus: true } },
    },
    orderBy: { role_cd: 'asc' },
  });
  return roles;
}

export async function getRoleById(roleCd: string) {
  const role = await prisma.tbRole.findUnique({
    where: { role_cd: roleCd },
    select: {
      ...roleSelectFields,
      role_menus: {
        select: {
          menu_id: true,
          can_create: true,
          can_read: true,
          can_update: true,
          can_delete: true,
          can_print: true,
          menu: { select: { menu_id: true, menu_nm: true, menu_url: true, sort_order: true } },
        },
        orderBy: { menu: { sort_order: 'asc' } },
      },
    },
  });
  if (!role) throw new AppError('존재하지 않는 역할입니다.', 404);
  return role;
}

export interface RoleCreateInput {
  role_cd: string;
  role_nm: string;
  role_desc?: string;
  create_by?: string;
}

export async function createRole(input: RoleCreateInput) {
  const existing = await prisma.tbRole.findUnique({ where: { role_cd: input.role_cd } });
  if (existing) throw new AppError('이미 존재하는 역할 코드입니다.', 409);

  return prisma.tbRole.create({
    data: {
      role_cd: input.role_cd,
      role_nm: input.role_nm,
      role_desc: input.role_desc ?? null,
      use_yn: 'Y',
      create_by: input.create_by ?? null,
      update_by: input.create_by ?? null,
    },
    select: roleSelectFields,
  });
}

export interface RoleUpdateInput {
  role_nm?: string;
  role_desc?: string;
  use_yn?: string;
  update_by?: string;
}

export async function updateRole(roleCd: string, input: RoleUpdateInput) {
  const existing = await prisma.tbRole.findUnique({ where: { role_cd: roleCd } });
  if (!existing) throw new AppError('존재하지 않는 역할입니다.', 404);

  return prisma.tbRole.update({
    where: { role_cd: roleCd },
    data: {
      ...(input.role_nm !== undefined && { role_nm: input.role_nm }),
      ...(input.role_desc !== undefined && { role_desc: input.role_desc }),
      ...(input.use_yn !== undefined && { use_yn: input.use_yn }),
      update_by: input.update_by ?? null,
      update_dt: new Date(),
    },
    select: roleSelectFields,
  });
}

export async function deleteRole(roleCd: string) {
  const existing = await prisma.tbRole.findUnique({
    where: { role_cd: roleCd },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) throw new AppError('존재하지 않는 역할입니다.', 404);
  if (existing._count.users > 0) {
    throw new AppError('해당 역할에 사용자가 배정되어 있어 삭제할 수 없습니다.', 400);
  }

  // Delete role_menus first, then role
  await prisma.$transaction([
    prisma.tbRoleMenu.deleteMany({ where: { role_cd: roleCd } }),
    prisma.tbRole.delete({ where: { role_cd: roleCd } }),
  ]);

  invalidatePermissionCache(roleCd);
  return { message: '역할이 삭제되었습니다.' };
}

// ─── Role-Menu Permissions ───

export interface PermissionInput {
  menu_id: number;
  can_create: string; // Y/N
  can_read: string;
  can_update: string;
  can_delete: string;
  can_print: string;
}

/**
 * Bulk-set menu permissions for a role.
 * Replaces all existing role_menu rows for this role_cd with the provided list.
 */
export async function setRolePermissions(
  roleCd: string,
  permissions: PermissionInput[],
  updatedBy?: string,
) {
  const role = await prisma.tbRole.findUnique({ where: { role_cd: roleCd } });
  if (!role) throw new AppError('존재하지 않는 역할입니다.', 404);

  // Validate all menu_ids exist
  const menuIds = permissions.map((p) => p.menu_id);
  if (menuIds.length > 0) {
    const menus = await prisma.tbMenu.findMany({
      where: { menu_id: { in: menuIds } },
      select: { menu_id: true },
    });
    const existingIds = new Set(menus.map((m) => m.menu_id));
    const invalid = menuIds.filter((id) => !existingIds.has(id));
    if (invalid.length > 0) {
      throw new AppError(`존재하지 않는 메뉴 ID: ${invalid.join(', ')}`, 400);
    }
  }

  await prisma.$transaction([
    prisma.tbRoleMenu.deleteMany({ where: { role_cd: roleCd } }),
    ...permissions.map((p) =>
      prisma.tbRoleMenu.create({
        data: {
          role_cd: roleCd,
          menu_id: p.menu_id,
          can_create: p.can_create,
          can_read: p.can_read,
          can_update: p.can_update,
          can_delete: p.can_delete,
          can_print: p.can_print,
          create_by: updatedBy ?? null,
          update_by: updatedBy ?? null,
        },
      }),
    ),
  ]);

  // Invalidate cached permissions for this role
  invalidatePermissionCache(roleCd);

  return getRoleById(roleCd);
}
