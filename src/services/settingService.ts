import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── Company ───

export async function getCompany() {
  const company = await prisma.tbCompany.findFirst();
  if (!company) {
    throw new AppError('회사 정보가 존재하지 않습니다.', 404);
  }
  return company;
}

export async function updateCompany(
  data: {
    company_cd: string;
    company_nm?: string;
    biz_no?: string;
    ceo_nm?: string;
    address?: string;
    tel?: string;
    fax?: string;
  },
  userId?: string,
) {
  const existing = await prisma.tbCompany.findUnique({ where: { company_cd: data.company_cd } });
  if (!existing) {
    throw new AppError('해당 회사 정보를 찾을 수 없습니다.', 404);
  }
  return prisma.tbCompany.update({
    where: { company_cd: data.company_cd },
    data: {
      ...(data.company_nm !== undefined && { company_nm: data.company_nm }),
      ...(data.biz_no !== undefined && { biz_no: data.biz_no }),
      ...(data.ceo_nm !== undefined && { ceo_nm: data.ceo_nm }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.tel !== undefined && { tel: data.tel }),
      ...(data.fax !== undefined && { fax: data.fax }),
      update_by: userId,
    },
  });
}

// ─── Numberings ───

export async function listNumberings() {
  return prisma.tbNumbering.findMany({ orderBy: { num_type: 'asc' } });
}

export async function updateNumbering(
  numType: string,
  data: { prefix?: string; seq_length?: number },
  userId?: string,
) {
  const existing = await prisma.tbNumbering.findUnique({ where: { num_type: numType } });
  if (!existing) {
    throw new AppError('해당 채번 규칙을 찾을 수 없습니다.', 404);
  }
  return prisma.tbNumbering.update({
    where: { num_type: numType },
    data: {
      ...(data.prefix !== undefined && { prefix: data.prefix }),
      ...(data.seq_length !== undefined && { seq_length: data.seq_length }),
    },
  });
}

// ─── System Settings (key-value) ───

export async function getSettings(group?: string) {
  return prisma.tbSysSetting.findMany({
    where: group ? { setting_group: group } : {},
    orderBy: [{ setting_group: 'asc' }, { setting_key: 'asc' }],
  });
}

export async function batchUpsertSettings(
  settings: { key: string; value: string }[],
  userId?: string,
) {
  if (!settings || settings.length === 0) {
    return [];
  }
  return prisma.$transaction(
    settings.map((s) =>
      prisma.tbSysSetting.upsert({
        where: { setting_key: s.key },
        update: { setting_value: s.value, update_by: userId },
        create: {
          setting_key: s.key,
          setting_value: s.value,
          setting_group: 'DEFAULT',
          create_by: userId,
          update_by: userId,
        },
      }),
    ),
  );
}
