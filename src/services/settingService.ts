import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { getTenantContext } from '../middlewares/tenantContext';

/** 현재 요청이 다루는 회사코드. 일반 사용자=소속사, SYS_ADMIN=X-Company-Cd 헤더. */
function currentCompanyCd(): string {
  const ctx = getTenantContext();
  const cd = ctx?.bypass ? ctx.adminWriteCompanyCd : ctx?.companyCd;
  if (!cd) {
    throw new AppError('회사 컨텍스트가 없습니다. (SYS_ADMIN은 X-Company-Cd 헤더 필요)', 400);
  }
  return cd;
}

// ─── Company ───

export async function getCompany() {
  // 자기 회사 정보만 (SYS_ADMIN은 헤더 지정 회사)
  const company = await prisma.tbCompany.findUnique({ where: { company_cd: currentCompanyCd() } });
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
  // body의 company_cd는 무시 — 컨텍스트 회사만 수정 가능 (타사 회사정보 변조 차단)
  const companyCd = currentCompanyCd();
  const existing = await prisma.tbCompany.findUnique({ where: { company_cd: companyCd } });
  if (!existing) {
    throw new AppError('해당 회사 정보를 찾을 수 없습니다.', 404);
  }
  return prisma.tbCompany.update({
    where: { company_cd: companyCd },
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
  // 회사별 규칙 — findFirst는 테넌트 확장이 자동 필터, update는 복합 키로 대상 회사 고정
  const existing = await prisma.tbNumbering.findFirst({ where: { num_type: numType } });
  if (!existing) {
    throw new AppError('해당 채번 규칙을 찾을 수 없습니다.', 404);
  }
  return prisma.tbNumbering.update({
    where: { company_cd_num_type: { company_cd: existing.company_cd, num_type: numType } },
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
  // 회사별 설정 — 복합 PK (company_cd, setting_key)
  const companyCd = currentCompanyCd();
  return prisma.$transaction(
    settings.map((s) =>
      prisma.tbSysSetting.upsert({
        where: { company_cd_setting_key: { company_cd: companyCd, setting_key: s.key } },
        update: { setting_value: s.value, update_by: userId },
        create: {
          company_cd: companyCd,
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
