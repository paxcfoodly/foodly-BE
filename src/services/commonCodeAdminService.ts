import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { invalidateCodeCache } from './commonCodeService';

// ─── Code Group CRUD ───

const groupSelect = {
  group_cd: true,
  group_nm: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

export async function listCodeGroupsAdmin() {
  return prisma.tbCommonCodeGrp.findMany({
    select: {
      ...groupSelect,
      _count: { select: { codes: true } },
    },
    orderBy: { group_cd: 'asc' },
  });
}

export async function getCodeGroupById(groupCd: string) {
  const group = await prisma.tbCommonCodeGrp.findUnique({
    where: { group_cd: groupCd },
    select: {
      ...groupSelect,
      codes: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });
  if (!group) throw new AppError('존재하지 않는 코드그룹입니다.', 404);
  return group;
}

export interface CodeGroupCreateInput {
  group_cd: string;
  group_nm: string;
  create_by?: string;
}

export async function createCodeGroup(input: CodeGroupCreateInput) {
  const existing = await prisma.tbCommonCodeGrp.findUnique({ where: { group_cd: input.group_cd } });
  if (existing) throw new AppError('이미 존재하는 그룹 코드입니다.', 409);

  const group = await prisma.tbCommonCodeGrp.create({
    data: {
      group_cd: input.group_cd,
      group_nm: input.group_nm,
      use_yn: 'Y',
      create_by: input.create_by ?? null,
      update_by: input.create_by ?? null,
    },
    select: groupSelect,
  });
  invalidateCodeCache();
  return group;
}

export interface CodeGroupUpdateInput {
  group_nm?: string;
  use_yn?: string;
  update_by?: string;
}

export async function updateCodeGroup(groupCd: string, input: CodeGroupUpdateInput) {
  const existing = await prisma.tbCommonCodeGrp.findUnique({ where: { group_cd: groupCd } });
  if (!existing) throw new AppError('존재하지 않는 코드그룹입니다.', 404);

  const group = await prisma.tbCommonCodeGrp.update({
    where: { group_cd: groupCd },
    data: {
      ...(input.group_nm !== undefined && { group_nm: input.group_nm }),
      ...(input.use_yn !== undefined && { use_yn: input.use_yn }),
      update_by: input.update_by ?? null,
      update_dt: new Date(),
    },
    select: groupSelect,
  });
  invalidateCodeCache();
  return group;
}

export async function deleteCodeGroup(groupCd: string) {
  const existing = await prisma.tbCommonCodeGrp.findUnique({
    where: { group_cd: groupCd },
    include: { _count: { select: { codes: true } } },
  });
  if (!existing) throw new AppError('존재하지 않는 코드그룹입니다.', 404);
  if (existing._count.codes > 0) {
    throw new AppError('하위 코드가 존재하여 삭제할 수 없습니다. 먼저 하위 코드를 삭제해주세요.', 400);
  }

  await prisma.tbCommonCodeGrp.delete({ where: { group_cd: groupCd } });
  invalidateCodeCache();
  return { message: '코드그룹이 삭제되었습니다.' };
}

// ─── Code Detail CRUD ───

const codeSelect = {
  group_cd: true,
  code: true,
  code_nm: true,
  sort_order: true,
  use_yn: true,
  create_by: true,
  create_dt: true,
  update_by: true,
  update_dt: true,
} as const;

export interface CodeCreateInput {
  group_cd: string;
  code: string;
  code_nm: string;
  sort_order?: number;
  create_by?: string;
}

export async function createCode(input: CodeCreateInput) {
  // Validate group exists
  const group = await prisma.tbCommonCodeGrp.findUnique({ where: { group_cd: input.group_cd } });
  if (!group) throw new AppError('존재하지 않는 코드그룹입니다.', 404);

  const existing = await prisma.tbCommonCode.findUnique({
    where: { group_cd_code: { group_cd: input.group_cd, code: input.code } },
  });
  if (existing) throw new AppError('이미 존재하는 코드입니다.', 409);

  const code = await prisma.tbCommonCode.create({
    data: {
      group_cd: input.group_cd,
      code: input.code,
      code_nm: input.code_nm,
      sort_order: input.sort_order ?? 0,
      use_yn: 'Y',
      create_by: input.create_by ?? null,
      update_by: input.create_by ?? null,
    },
    select: codeSelect,
  });
  invalidateCodeCache();
  return code;
}

export interface CodeUpdateInput {
  code_nm?: string;
  sort_order?: number;
  use_yn?: string;
  update_by?: string;
}

export async function updateCode(groupCd: string, code: string, input: CodeUpdateInput) {
  const existing = await prisma.tbCommonCode.findUnique({
    where: { group_cd_code: { group_cd: groupCd, code } },
  });
  if (!existing) throw new AppError('존재하지 않는 코드입니다.', 404);

  const updated = await prisma.tbCommonCode.update({
    where: { group_cd_code: { group_cd: groupCd, code } },
    data: {
      ...(input.code_nm !== undefined && { code_nm: input.code_nm }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      ...(input.use_yn !== undefined && { use_yn: input.use_yn }),
      update_by: input.update_by ?? null,
      update_dt: new Date(),
    },
    select: codeSelect,
  });
  invalidateCodeCache();
  return updated;
}

export async function deleteCode(groupCd: string, code: string) {
  const existing = await prisma.tbCommonCode.findUnique({
    where: { group_cd_code: { group_cd: groupCd, code } },
  });
  if (!existing) throw new AppError('존재하지 않는 코드입니다.', 404);

  await prisma.tbCommonCode.delete({
    where: { group_cd_code: { group_cd: groupCd, code } },
  });
  invalidateCodeCache();
  return { message: '코드가 삭제되었습니다.' };
}
