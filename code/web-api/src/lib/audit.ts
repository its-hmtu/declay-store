import { AuditLog, type AuditActorType, type AuditSource } from '@/modules/audit/audit.entity';

export interface AuditEntry {
  actorType: AuditActorType;
  actorId?: number | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  source: AuditSource;
  status?: 'success' | 'error';
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an audit entry. Fire-and-forget by design: an audit failure must never
 * break or delay the action being audited, so errors are logged and swallowed.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      source: entry.source,
      status: entry.status ?? 'success',
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error('⚠️  Failed to write audit log:', (err as Error).message);
  }
}
