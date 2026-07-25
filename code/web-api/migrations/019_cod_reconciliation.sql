-- M-07: reconcile cash the carrier collected on delivery against the order total (BR-11).
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS reconciled_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS reconciled_by     INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconcile_note    VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_payments_cod_pending
  ON payments(method) WHERE reconciled_at IS NULL;
