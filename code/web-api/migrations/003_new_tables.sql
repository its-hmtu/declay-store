-- =============================================================
-- Declay Store — Migration 003: New feature tables
-- Idempotent: all statements use IF NOT EXISTS / IF EXISTS
-- Run order matters: tables with FK deps must come after parents
-- =============================================================

-- ── 14. product_reviews ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id                   SERIAL PRIMARY KEY,
  user_id              INT          NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
  product_id           INT          NOT NULL REFERENCES products(id)         ON DELETE CASCADE,
  variant_id           INT          REFERENCES product_variants(id)          ON DELETE SET NULL,
  rating               SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                VARCHAR(200),
  body                 TEXT,
  is_verified_purchase BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id    ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating     ON product_reviews(rating);

-- ── 15. discount_codes ───────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE discount_type_enum AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS discount_codes (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(50)          NOT NULL UNIQUE,
  type             discount_type_enum   NOT NULL,
  value            NUMERIC(10,2)        NOT NULL CHECK (value > 0),
  min_order_amount NUMERIC(10,2)        NOT NULL DEFAULT 0,
  max_uses         INT,                              -- NULL = unlimited
  used_count       INT                  NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN              NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code      ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON discount_codes(is_active);

-- Extend orders to track applied discount
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code_id INT REFERENCES discount_codes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 16. order_shipments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_shipments (
  id                    SERIAL PRIMARY KEY,
  order_id              INT          NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  carrier               VARCHAR(100) NOT NULL,
  tracking_number       VARCHAR(255) NOT NULL,
  shipped_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON order_shipments(order_id);

-- ── 17. email_verification_tokens ────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token   ON email_verification_tokens(token);

-- ── 18. password_reset_tokens ────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token   ON password_reset_tokens(token);

-- ── 19. wishlists ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 20. wishlist_items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          SERIAL PRIMARY KEY,
  wishlist_id INT         NOT NULL REFERENCES wishlists(id)        ON DELETE CASCADE,
  variant_id  INT         NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wishlist_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_variant_id  ON wishlist_items(variant_id);

-- ── 21. chat_sessions ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE chat_session_type_enum AS ENUM ('storefront', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id           SERIAL PRIMARY KEY,
  session_type chat_session_type_enum NOT NULL DEFAULT 'storefront',
  user_id      INT  REFERENCES users(id)       ON DELETE SET NULL,
  admin_id     INT  REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id  ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_admin_id ON chat_sessions(admin_id);

-- ── 22. chat_messages ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE chat_role_enum AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         SERIAL PRIMARY KEY,
  session_id INT         NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       chat_role_enum NOT NULL,
  content    TEXT         NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ── 23. tags ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- ── 24. product_tags ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_tags (
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     INT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);

-- ── 25. article_tags ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     INT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);

-- ── 26. banners ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255),
  subtitle   VARCHAR(255),
  image_url  TEXT         NOT NULL,
  link_url   TEXT,
  position   INT          NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_by INT          REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_position  ON banners(position);

-- ── 27. site_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by INT          REFERENCES admin_users(id) ON DELETE SET NULL
);
