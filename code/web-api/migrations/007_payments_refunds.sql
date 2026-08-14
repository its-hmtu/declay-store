-- =============================================================
-- Declay Store — Migration 007: payments & refunds
-- A payment/refund ledger separate from orders, so multiple payment
-- attempts and partial refunds can be recorded and reconciled.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                       BIGSERIAL PRIMARY KEY,
  order_id                 INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  amount                   NUMERIC(10,2) NOT NULL,
  currency                 VARCHAR(10) NOT NULL DEFAULT 'usd',
  status                   VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | succeeded | failed
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_pi    ON payments(stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS refunds (
  id               BIGSERIAL PRIMARY KEY,
  order_id         INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id       BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  stripe_refund_id VARCHAR(255),
  amount           NUMERIC(10,2) NOT NULL,
  reason           VARCHAR(255),
  status           VARCHAR(20) NOT NULL DEFAULT 'succeeded',  -- pending | succeeded | failed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
