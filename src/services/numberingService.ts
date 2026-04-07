import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

/**
 * Generate the next sequential number for a given type.
 *
 * Format: {prefix}-{date}-{seq}
 * Example: 'WO' → 'WO-20260407-0001'
 *
 * Uses Prisma interactive transaction with serializable isolation
 * to prevent duplicate numbers under concurrent calls.
 */
export async function generateNumber(numType: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Lock row with FOR UPDATE via raw query for concurrency safety
    const rows: any[] = await tx.$queryRawUnsafe(
      `SELECT * FROM tb_numbering WHERE num_type = $1 FOR UPDATE`,
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

    // Update last_seq
    await tx.$queryRawUnsafe(
      `UPDATE tb_numbering SET last_seq = $1, update_dt = NOW() WHERE num_type = $2`,
      nextSeq,
      numType,
    );

    return generatedNumber;
  });
}

/**
 * Generate a number with date-based sequence reset.
 * Resets last_seq to 0 when the date changes.
 */
export async function generateNumberWithDateReset(numType: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const rows: any[] = await tx.$queryRawUnsafe(
      `SELECT * FROM tb_numbering WHERE num_type = $1 FOR UPDATE`,
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
      `UPDATE tb_numbering SET last_seq = $1, update_dt = NOW() WHERE num_type = $2`,
      nextSeq,
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
