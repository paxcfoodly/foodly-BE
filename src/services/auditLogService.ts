import prisma from '../config/database';

export interface AuditLogListParams {
  page: number;
  limit: number;
  offset: number;
  where: Record<string, unknown>;
  orderBy: Array<Record<string, string>>;
}

/**
 * List audit logs with pagination and filtering.
 * Filters: user_id, action, target_table, date range (start_dt, end_dt).
 */
export async function listAuditLogs(params: AuditLogListParams) {
  const { page, limit, offset, where, orderBy } = params;
  const effectiveOrderBy = orderBy.length > 0 ? orderBy : [{ log_id: 'desc' }];

  const [logs, total] = await Promise.all([
    prisma.tbAuditLog.findMany({
      where,
      select: {
        log_id: true,
        user_id: true,
        action: true,
        target_table: true,
        record_id: true,
        before_data: true,
        after_data: true,
        ip_address: true,
        create_dt: true,
        user: {
          select: { user_id: true, login_id: true, user_nm: true },
        },
      },
      orderBy: effectiveOrderBy as any,
      skip: offset,
      take: limit,
    }),
    prisma.tbAuditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

/**
 * Get a single audit log entry by ID.
 */
export async function getAuditLogById(logId: number) {
  return prisma.tbAuditLog.findUnique({
    where: { log_id: logId },
    select: {
      log_id: true,
      user_id: true,
      action: true,
      target_table: true,
      record_id: true,
      before_data: true,
      after_data: true,
      ip_address: true,
      create_dt: true,
      user: {
        select: { user_id: true, login_id: true, user_nm: true },
      },
    },
  });
}
