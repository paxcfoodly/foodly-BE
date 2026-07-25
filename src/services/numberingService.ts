import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { getTenantContext } from '../middlewares/tenantContext';

/**
 * 채번 대상 회사 결정 (멀티테넌시 스펙 D-8).
 * 일반 사용자 = 소속 회사, SYS_ADMIN = X-Company-Cd 헤더 지정 회사.
 * 시스템 컨텍스트(시드/스크립트)는 호출부가 companyCd를 직접 넘겨야 한다.
 */
function resolveCompanyCd(explicit?: string): string {
  if (explicit) return explicit;
  const ctx = getTenantContext();
  const cd = ctx?.bypass ? ctx.adminWriteCompanyCd : ctx?.companyCd;
  if (!cd) {
    throw new AppError('채번 대상 회사를 결정할 수 없습니다. (테넌트 컨텍스트 없음)', 400);
  }
  return cd;
}

/**
 * Generate the next sequential number for a given type.
 *
 * Format: {prefix}-{date}-{seq}
 * Example: 'WO' → 'WO-20260407-0001'
 *
 * 회사별 독립 시퀀스 — tb_numbering 복합 PK (company_cd, num_type).
 * Uses Prisma interactive transaction with row lock (FOR UPDATE)
 * to prevent duplicate numbers under concurrent calls.
 */
export async function generateNumber(numType: string, companyCd?: string): Promise<string> {
  const cd = resolveCompanyCd(companyCd);
  return prisma.$transaction(async (tx) => {
    const rows: any[] = await tx.$queryRawUnsafe(
      `SELECT * FROM tb_numbering WHERE company_cd = $1 AND num_type = $2 FOR UPDATE`,
      cd,
      numType,
    );

    if (!rows || rows.length === 0) {
      throw new AppError(`채번 규칙을 찾을 수 없습니다: ${numType}`, 404);
    }

    const rule = rows[0];
    const today = formatDate(new Date(), rule.date_format);
    const nextSeq = rule.last_seq + 1;
    const seqStr = String(nextSeq).padStart(rule.seq_length, '0');
    const generatedNumber = `${rule.prefix}-${today}-${seqStr}`;

    await tx.$queryRawUnsafe(
      `UPDATE tb_numbering SET last_seq = $1, update_dt = NOW() WHERE company_cd = $2 AND num_type = $3`,
      nextSeq,
      cd,
      numType,
    );

    return generatedNumber;
  });
}

/**
 * Generate a number with date-based sequence reset.
 * Resets last_seq to 0 when the date changes. 회사별 독립 시퀀스.
 */
export async function generateNumberWithDateReset(numType: string, companyCd?: string): Promise<string> {
  const cd = resolveCompanyCd(companyCd);
  return prisma.$transaction(async (tx) => {
    const rows: any[] = await tx.$queryRawUnsafe(
      `SELECT * FROM tb_numbering WHERE company_cd = $1 AND num_type = $2 FOR UPDATE`,
      cd,
      numType,
    );

    if (!rows || rows.length === 0) {
      throw new AppError(`채번 규칙을 찾을 수 없습니다: ${numType}`, 404);
    }

    const rule = rows[0];
    const today = formatDate(new Date(), rule.date_format);
    const lastDate = formatDate(new Date(rule.update_dt), rule.date_format);

    // Reset sequence if date changed
    const baseSeq = today !== lastDate ? 0 : rule.last_seq;
    const nextSeq = baseSeq + 1;
    const seqStr = String(nextSeq).padStart(rule.seq_length, '0');
    const generatedNumber = `${rule.prefix}-${today}-${seqStr}`;

    await tx.$queryRawUnsafe(
      `UPDATE tb_numbering SET last_seq = $1, update_dt = NOW() WHERE company_cd = $2 AND num_type = $3`,
      nextSeq,
      cd,
      numType,
    );

    return generatedNumber;
  });
}

function formatDate(date: Date, format: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYYMMDD':
      return `${y}${m}${d}`;
    case 'YYMMDD':
      return `${String(y).slice(-2)}${m}${d}`;
    case 'YYMM':
      return `${String(y).slice(-2)}${m}`;
    case 'YYYYMM':
      return `${y}${m}`;
    default:
      return `${y}${m}${d}`;
  }
}
