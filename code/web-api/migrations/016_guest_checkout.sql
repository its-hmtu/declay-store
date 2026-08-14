-- M-01: guest checkout — carts/orders/addresses may belong to an anonymous session.
ALTER TABLE carts
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL;

ALTER TABLE addresses
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name  VARCHAR(120),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(160),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS guest_token VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);
