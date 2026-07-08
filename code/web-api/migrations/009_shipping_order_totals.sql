-- =============================================================
-- Declay Store — Migration 009: shipping methods + order totals
-- W-15: a shipping_methods table (fee, free-over threshold, zone).
-- W-14: store subtotal / shipping_fee / shipping_method_id on each order so
--       the final total is reconstructable regardless of later price changes.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- =============================================================

CREATE TABLE IF NOT EXISTS shipping_methods (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  description    VARCHAR(255),
  zone           VARCHAR(20) NOT NULL DEFAULT 'all',   -- all | domestic | international
  fee            NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_over      NUMERIC(10,2),                        -- free shipping when subtotal >= this
  estimated_days VARCHAR(50),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee      NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id INT REFERENCES shipping_methods(id) ON DELETE SET NULL;

INSERT INTO shipping_methods (name, description, zone, fee, free_over, estimated_days, sort_order)
VALUES
  ('Standard Shipping', 'Tracked delivery', 'all', 5.00, 75.00, '3–5 business days', 1),
  ('Express Shipping', 'Faster tracked delivery', 'all', 12.00, NULL, '1–2 business days', 2),
  ('International Shipping', 'Worldwide tracked delivery', 'international', 25.00, NULL, '7–14 business days', 3)
ON CONFLICT DO NOTHING;
