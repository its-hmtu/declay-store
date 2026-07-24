-- =============================================================
-- Declay Store — Migration 012: discount campaigns (pricing increment 2)
-- A campaign applies one common % discount to its member products while
-- active (within its schedule). Effective price = best of base / special /
-- campaign. Safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  description      VARCHAR(500),
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       INT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product ON campaign_products(product_id);
