import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: number;
    loginId: string;
    userNm: string;
    roleCd: string | null;
    roleNm: string | null;
    companyCd: string | null;
    companyNm: string | null;
  };
}

export interface UserProfile {
  userId: number;
  loginId: string;
  userNm: string;
  roleCd: string | null;
  roleNm: string | null;
  companyCd: string | null;
  companyNm: string | null;
  status: string;
  permissions: Array<{
    menuId: number;
    menuNm: string;
    menuUrl: string | null;
    canCreate: string;
    canRead: string;
    canUpdate: string;
    canDelete: string;
  }>;
}

/**
 * Authenticate user with login_id + password, return JWT tokens.
 */
export async function login(loginId: string, password: string, ipAddress?: string): Promise<LoginResult> {
  // 1. Find user with role info
  const user = await prisma.tbUser.findUnique({
    where: { login_id: loginId },
    include: { role: true, company: true },
  });

  if (!user) {
    // Log failed login attempt (no user_id available)
    await writeAuditLog(null, 'LOGIN_FAIL', ipAddress, { loginId, reason: 'user_not_found' }, null);
    throw new AppError('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
  }

  // 2. Check account status
  if (user.status !== 'ACTIVE') {
    await writeAuditLog(user.user_id, 'LOGIN_FAIL', ipAddress, { loginId, reason: 'account_inactive', status: user.status }, user.company_cd);
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요.', 403);
  }

  // 2-1. Check company status (중지된 회사 소속이면 차단, admin 등 무소속은 예외)
  if (user.company_cd) {
    const company = await prisma.tbCompany.findUnique({
      where: { company_cd: user.company_cd },
      select: { use_yn: true },
    });
    if (company && company.use_yn !== 'Y') {
      await writeAuditLog(user.user_id, 'LOGIN_FAIL', ipAddress, { loginId, reason: 'company_inactive' }, user.company_cd);
      throw new AppError('소속 회사가 중지된 상태입니다. 관리자에게 문의하세요.', 403);
    }
  }

  // 3. Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    await writeAuditLog(user.user_id, 'LOGIN_FAIL', ipAddress, { loginId, reason: 'wrong_password' }, user.company_cd);
    throw new AppError('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
  }

  // 4. Generate tokens
  const tokenPayload = {
    userId: user.user_id,
    loginId: user.login_id,
    userNm: user.user_nm,
    roleCd: user.role_cd,
    companyCd: user.company_cd,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // 5. Audit log success
  await writeAuditLog(user.user_id, 'LOGIN', ipAddress, undefined, user.company_cd);

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.user_id,
      loginId: user.login_id,
      userNm: user.user_nm,
      roleCd: user.role_cd,
      roleNm: user.role?.role_nm ?? null,
      companyCd: user.company_cd,
      companyNm: user.company?.company_nm ?? null,
    },
  };
}

/**
 * Refresh access token using a valid refresh token.
 */
export async function refresh(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshTokenStr);
  } catch {
    throw new AppError('유효하지 않은 리프레시 토큰입니다.', 401);
  }

  // Verify user still exists and is active
  const user = await prisma.tbUser.findUnique({
    where: { user_id: payload.userId },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('비활성화된 계정입니다.', 403);
  }

  // 회사 중지 여부 확인 (refresh 시점에도 차단)
  if (user.company_cd) {
    const company = await prisma.tbCompany.findUnique({
      where: { company_cd: user.company_cd },
      select: { use_yn: true },
    });
    if (company && company.use_yn !== 'Y') {
      throw new AppError('소속 회사가 중지된 상태입니다.', 403);
    }
  }

  // Issue fresh tokens (in case role/company changed since last login)
  const tokenPayload = {
    userId: user.user_id,
    loginId: user.login_id,
    userNm: user.user_nm,
    roleCd: user.role_cd,
    companyCd: user.company_cd,
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
  };
}

/**
 * Get current user profile with permissions.
 */
export async function getProfile(userId: number): Promise<UserProfile> {
  const user = await prisma.tbUser.findUnique({
    where: { user_id: userId },
    include: { role: true, company: true },
  });

  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다.', 404);
  }

  // Fetch role-menu permissions
  let permissions: UserProfile['permissions'] = [];
  if (user.role_cd) {
    const roleMenus = await prisma.tbRoleMenu.findMany({
      where: { role_cd: user.role_cd },
      include: { menu: true },
      orderBy: { menu: { sort_order: 'asc' } },
    });

    permissions = roleMenus.map((rm: any) => ({
      menuId: rm.menu_id,
      menuNm: rm.menu?.menu_nm ?? '',
      menuUrl: rm.menu?.menu_url ?? null,
      canCreate: rm.can_create,
      canRead: rm.can_read,
      canUpdate: rm.can_update,
      canDelete: rm.can_delete,
    }));
  }

  return {
    userId: user.user_id,
    loginId: user.login_id,
    userNm: user.user_nm,
    roleCd: user.role_cd,
    roleNm: user.role?.role_nm ?? null,
    companyCd: user.company_cd,
    companyNm: user.company?.company_nm ?? null,
    status: user.status,
    permissions,
  };
}

/**
 * Record logout event in audit log.
 */
export async function logout(userId: number, ipAddress?: string): Promise<void> {
  await writeAuditLog(userId, 'LOGOUT', ipAddress);
}

// ─── Helper ───

async function writeAuditLog(
  userId: number | null,
  action: string,
  ipAddress?: string,
  afterData?: Record<string, unknown>,
  companyCd?: string | null,
): Promise<void> {
  try {
    await prisma.tbAuditLog.create({
      data: {
        // 로그인/로그아웃은 테넌트 컨텍스트 밖 — 회사 미상은 SYSTEM으로 기록
        company_cd: companyCd ?? 'SYSTEM',
        user_id: userId,
        action,
        target_table: 'tb_user',
        ip_address: ipAddress ?? null,
        after_data: afterData ? JSON.parse(JSON.stringify(afterData)) : undefined,
      },
    });
  } catch (err) {
    // Don't let audit logging failures break the auth flow
    console.error('[AUTH] Failed to write audit log:', err);
  }
}

/**
 * 본인 비밀번호 변경 (멀티테넌시 Phase 2 ④).
 * 현재 비밀번호 검증 후 새 비밀번호(8자 이상)로 교체한다.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  ipAddress?: string,
): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('새 비밀번호는 8자 이상이어야 합니다.', 400);
  }
  const user = await prisma.tbUser.findUnique({ where: { user_id: userId } });
  if (!user) throw new AppError('사용자를 찾을 수 없습니다.', 404);

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new AppError('현재 비밀번호가 올바르지 않습니다.', 400);

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.tbUser.update({
    where: { user_id: userId },
    data: { password: hashed, update_by: user.login_id },
  });
  await writeAuditLog(userId, 'PASSWORD_CHANGE', ipAddress, undefined, user.company_cd);
}
