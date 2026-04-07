import prisma from '../config/database';

export interface AuditLogParams {
  userId: number | null;
  action: string;        // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  targetTable?: string;
  recordId?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string;
}

/**
 * Write a record to TB_AUDIT_LOG.
 * Failures are logged to console but never thrown — audit should not break business flows.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.tbAuditLog.create({
      data: {
        user_id: params.userId,
        action: params.action,
        target_table: params.targetTable ?? null,
        record_id: params.recordId ?? null,
        before_data: params.beforeData ? JSON.parse(JSON.stringify(params.beforeData)) : undefined,
        after_data: params.afterData ? JSON.parse(JSON.stringify(params.afterData)) : undefined,
        ip_address: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}

/**
 * Convenience wrappers for common CRUD operations.
 */
export async function logCreate(
  userId: number | null,
  table: string,
  recordId: string,
  data: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  return logAudit({
    userId,
    action: 'CREATE',
    targetTable: table,
    recordId,
    afterData: data,
    ipAddress,
  });
}

export async function logUpdate(
  userId: number | null,
  table: string,
  recordId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  return logAudit({
    userId,
    action: 'UPDATE',
    targetTable: table,
    recordId,
    beforeData: before,
    afterData: after,
    ipAddress,
  });
}

export async function logDelete(
  userId: number | null,
  table: string,
  recordId: string,
  before: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  return logAudit({
    userId,
    action: 'DELETE',
    targetTable: table,
    recordId,
    beforeData: before,
    ipAddress,
  });
}
