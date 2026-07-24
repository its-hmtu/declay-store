ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS method       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider_ref VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments(provider_ref);
