import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'foodly1234!';

export interface UserListParams {
  page: number;
  limit: number;
  offset: number;
  where: Record<string, unknown>;
  orderBy: Array<Record<string, string>>;
}

export interface UserCreateInput {
  login_id: string;
  password: string;
  user_nm: string;
  role_cd?: string | null;
  company_cd?: string | null;
  create_by?: string;
}

export interface UserUpdateInput {
  user_nm?: string;
  role_cd?: string | null;
  company_cd?: string | null;
  status?: string;
  update_by?: string;
}

// Fields returned in list / detail responses (never expose password)
const userSelectFields = {
  user_id: true,
  login_id: true,
  user_nm: true,
  role_cd: true,
  company_cd: true,
  status: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
  role: {
    select: { role_cd: true, role_nm: true },
  },
  company: {
    select: { company_cd: true, company_nm: true },
  },
} as const;

/**
 * Create a new user with bcrypt-hashed password.
 */
export async function createUser(input: UserCreateInput) {
  // Check for duplicate login_id
  const existing = await prisma.tbUser.findUnique({
    where: { login_id: input.login_id },
  });
  if (existing) {
    throw new AppError('이미 존재하는 로그인 ID입니다.', 409);
  }

  // Validate role_cd if provided
  if (input.role_cd) {
    const role = await prisma.tbRole.findUnique({ where: { role_cd: input.role_cd } });
    if (!role) {
      throw new AppError('존재하지 않는 역할 코드입니다.', 400);
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.tbUser.create({
    data: {
      login_id: input.login_id,
      password: hashedPassword,
      user_nm: input.user_nm,
      role_cd: input.role_cd ?? null,
      company_cd: input.company_cd ?? null,
      status: 'ACTIVE',
      create_by: input.create_by ?? null,
      update_by: input.create_by ?? null,
    },
    select: userSelectFields,
  });

  return user;
}

/**
 * List users with pagination, filtering, and sorting.
 */
export async function listUsers(params: UserListParams) {
  const { page, limit, offset, where, orderBy } = params;

  // Default sort: user_id desc
  const effectiveOrderBy = orderBy.length > 0 ? orderBy : [{ user_id: 'desc' }];

  const [users, total] = await Promise.all([
    prisma.tbUser.findMany({
      where,
      select: userSelectFields,
      orderBy: effectiveOrderBy as any,
      skip: offset,
      take: limit,
    }),
    prisma.tbUser.count({ where }),
  ]);

  return { users, total, page, limit };
}

/**
 * Get a single user by ID.
 */
export async function getUserById(userId: number) {
  const user = await prisma.tbUser.findUnique({
    where: { user_id: userId },
    select: userSelectFields,
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다.', 404);
  }

  return user;
}

/**
 * Update user fields (excluding password).
 */
export async function updateUser(userId: number, input: UserUpdateInput) {
  // Check user exists
  const existing = await prisma.tbUser.findUnique({ where: { user_id: userId } });
  if (!existing) {
    throw new AppError('사용자를 찾을 수 없습니다.', 404);
  }

  // Validate role_cd if changing
  if (input.role_cd !== undefined && input.role_cd !== null) {
    const role = await prisma.tbRole.findUnique({ where: { role_cd: input.role_cd } });
    if (!role) {
      throw new AppError('존재하지 않는 역할 코드입니다.', 400);
    }
  }

  const user = await prisma.tbUser.update({
    where: { user_id: userId },
    data: {
      ...(input.user_nm !== undefined && { user_nm: input.user_nm }),
      ...(input.role_cd !== undefined && { role_cd: input.role_cd }),
      ...(input.company_cd !== undefined && { company_cd: input.company_cd }),
      ...(input.status !== undefined && { status: input.status }),
      update_by: input.update_by ?? null,
      update_dt: new Date(),
    },
    select: userSelectFields,
  });

  return user;
}

/**
 * Soft-delete user by setting status to INACTIVE.
 */
export async function deleteUser(userId: number, deletedBy?: string) {
  const existing = await prisma.tbUser.findUnique({ where: { user_id: userId } });
  if (!existing) {
    throw new AppError('사용자를 찾을 수 없습니다.', 404);
  }

  if (existing.status === 'INACTIVE') {
    throw new AppError('이미 비활성화된 사용자입니다.', 400);
  }

  const user = await prisma.tbUser.update({
    where: { user_id: userId },
    data: {
      status: 'INACTIVE',
      update_by: deletedBy ?? null,
      update_dt: new Date(),
    },
    select: userSelectFields,
  });

  return user;
}

/**
 * Reset user password to default or a specified value.
 */
export async function resetPassword(userId: number, newPassword?: string, resetBy?: string) {
  const existing = await prisma.tbUser.findUnique({ where: { user_id: userId } });
  if (!existing) {
    throw new AppError('사용자를 찾을 수 없습니다.', 404);
  }

  const passwordToSet = newPassword || DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(passwordToSet, SALT_ROUNDS);

  await prisma.tbUser.update({
    where: { user_id: userId },
    data: {
      password: hashedPassword,
      update_by: resetBy ?? null,
      update_dt: new Date(),
    },
  });

  return { message: '비밀번호가 초기화되었습니다.' };
}
