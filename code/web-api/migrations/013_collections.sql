CREATE TABLE IF NOT EXISTS collections (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  slug         VARCHAR(170) NOT NULL UNIQUE,
  description  VARCHAR(500),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_by   INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);
