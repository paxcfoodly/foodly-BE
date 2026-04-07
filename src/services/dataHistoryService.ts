import prisma from '../config/database';

export interface DataHistoryParams {
  tableNm: string;
  recordId: string;
  columnNm: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  changeReason?: string | null;
  changeBy?: string | null;
}

/**
 * Log a single column-level data change to TB_DATA_HISTORY.
 * Failures are logged to console but never thrown — history logging should not break business flows.
 */
export async function logDataHistory(params: DataHistoryParams): Promise<void> {
  try {
    await prisma.tbDataHistory.create({
      data: {
        table_nm: params.tableNm,
        record_id: params.recordId,
        column_nm: params.columnNm,
        before_value: params.beforeValue ?? null,
        after_value: params.afterValue ?? null,
        change_reason: params.changeReason ?? null,
        change_by: params.changeBy ?? null,
      },
    });
  } catch (err) {
    console.error('[DATA_HISTORY] Failed to write data history:', err);
  }
}

/**
 * Log multiple column changes for a single record in one call.
 * Compares before and after objects, recording only changed columns.
 */
export async function logDataChanges(
  tableNm: string,
  recordId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changeReason?: string | null,
  changeBy?: string | null,
): Promise<void> {
  try {
    const entries: DataHistoryParams[] = [];

    for (const key of Object.keys(after)) {
      const bVal = before[key];
      const aVal = after[key];
      // Only log if the value actually changed
      if (String(bVal ?? '') !== String(aVal ?? '')) {
        entries.push({
          tableNm,
          recordId,
          columnNm: key,
          beforeValue: bVal != null ? String(bVal) : null,
          afterValue: aVal != null ? String(aVal) : null,
          changeReason,
          changeBy,
        });
      }
    }

    if (entries.length > 0) {
      await prisma.tbDataHistory.createMany({
        data: entries.map((e) => ({
          table_nm: e.tableNm,
          record_id: e.recordId,
          column_nm: e.columnNm,
          before_value: e.beforeValue,
          after_value: e.afterValue,
          change_reason: e.changeReason,
          change_by: e.changeBy,
        })),
      });
    }
  } catch (err) {
    console.error('[DATA_HISTORY] Failed to write data history batch:', err);
  }
}

/**
 * Query data change history for a specific table/record.
 */
export async function getDataHistory(
  tableNm: string,
  recordId?: string,
  options?: { page?: number; limit?: number },
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { table_nm: tableNm };
  if (recordId) {
    where.record_id = recordId;
  }

  const [total, items] = await Promise.all([
    prisma.tbDataHistory.count({ where: where as any }),
    prisma.tbDataHistory.findMany({
      where: where as any,
      orderBy: { change_dt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
