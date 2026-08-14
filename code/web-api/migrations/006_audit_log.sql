-- =============================================================
-- Declay Store — Migration 006: Audit log
-- Records who did what write action and when (admin UI + AI assistant),
-- so financial/destructive actions can be reconstructed during a review.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_type  VARCHAR(20)  NOT NULL,                    -- admin | ai_assistant | system
  actor_id    INTEGER,                                  -- admin_users.id (null for system)
  action      VARCHAR(255) NOT NULL,                    -- 'POST /api/admin/products' or tool name
  entity      VARCHAR(100),                             -- 'product' | 'order' | 'discount' | ...
  entity_id   VARCHAR(100),                             -- string so non-integer ids are allowed
  source      VARCHAR(20)  NOT NULL,                    -- admin_ui | ai_assistant | system
  status      VARCHAR(20)  NOT NULL DEFAULT 'success',  -- success | error
  metadata    JSONB,                                    -- request body/params, tool input, error
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
