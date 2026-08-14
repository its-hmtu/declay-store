import type { Request, Response, NextFunction } from 'express';
import { recordAudit } from '@/lib/audit';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'card'];

export function sanitizeAuditBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? '[redacted]' : v;
  }
  return out;
}

/**
 * Audits every successful admin write (POST/PUT/PATCH/DELETE under /admin) once the
 * response finishes. Mounted at app level; req.admin is populated by adminProtect by
 * the time 'finish' fires. AI tool executions are audited separately in the assistant.
 */
export function auditAdminWrites(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method) || !req.path.startsWith('/admin/')) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // only successful writes
    if (!req.admin) return; // not an authenticated admin action
    void recordAudit({
      actorType: 'admin',
      actorId: req.admin.adminId,
      action: `${req.method} ${req.baseUrl}${req.path}`,
      source: 'admin_ui',
      metadata: { params: req.params, body: sanitizeAuditBody(req.body), status: res.statusCode },
    });
  });

  next();
}
