-- =============================================================
-- Declay Store — Initial Schema Migration
-- Run order matters: tables with FK deps must come after parents
-- Idempotent: all statements use IF NOT EXISTS
-- =============================================================

-- ── 1. users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  username        VARCHAR(100) UNIQUE,
  full_name       VARCHAR(255),
  phone_number    VARCHAR(20),
  password        VARCHAR(255),
  google_id       VARCHAR(255) UNIQUE,
  auth_provider   VARCHAR(20)  DEFAULT 'local',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id  ON users(google_id);

-- ── 2. admin_users ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255),
  role        VARCHAR(20)  NOT NULL DEFAULT 'admin'
                CHECK (role IN ('super_admin', 'admin', 'editor')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 3. addresses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id              SERIAL PRIMARY KEY,
  user_id         INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_name   VARCHAR(255) NOT NULL,
  receiver_phone  VARCHAR(20)  NOT NULL,
  address_line    VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  ward            VARCHAR(100),
  district        VARCHAR(100),
  city            VARCHAR(100) NOT NULL,
  country         VARCHAR(100) NOT NULL DEFAULT 'Vietnam',
  postal_code     VARCHAR(20),
  is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
  address_type    VARCHAR(20)  NOT NULL DEFAULT 'home'
                  CHECK (address_type IN ('home', 'work', 'other')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_default_per_user
  ON addresses(user_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- ── 4. categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  slug        VARCHAR(120)  NOT NULL UNIQUE,
  description TEXT,
  parent_id   INT           REFERENCES categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ── 5. products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INT           NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name        VARCHAR(255)  NOT NULL,
  slug        VARCHAR(280)  NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug        ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON products(is_active);

-- ── 6. product_variants ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id          SERIAL PRIMARY KEY,
  product_id  INT           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(100)  NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock       INT           NOT NULL DEFAULT 0,
  images      TEXT[]        NOT NULL DEFAULT '{}',
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

-- ── 7. articles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  content      TEXT         NOT NULL,
  author_id    INT          NOT NULL,           -- references admin_users.id (no FK to keep it flexible)
  slug         VARCHAR(255) NOT NULL UNIQUE,
  views        INT          NOT NULL DEFAULT 0,
  is_published BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug         ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_is_published ON articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_author_id    ON articles(author_id);

-- ── 8. carts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. cart_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INT         NOT NULL REFERENCES carts(id)            ON DELETE CASCADE,
  variant_id INT         NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INT         NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id    ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);

-- ── 10. orders ───────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS order_status_enum AS ENUM (
  'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'
);

CREATE TABLE IF NOT EXISTS orders (
  id                        SERIAL PRIMARY KEY,
  user_id                   INT              NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                    order_status_enum NOT NULL DEFAULT 'pending_payment',
  total_amount              NUMERIC(10,2)    NOT NULL,
  stripe_payment_intent_id  VARCHAR(255)     UNIQUE,
  shipping_address_id       INT              REFERENCES addresses(id) ON DELETE SET NULL,
  notes                     TEXT,
  created_at                TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe  ON orders(stripe_payment_intent_id);

-- ── 11. order_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                       SERIAL PRIMARY KEY,
  order_id                 INT           NOT NULL REFERENCES orders(id)          ON DELETE CASCADE,
  variant_id               INT           NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity                 INT           NOT NULL CHECK (quantity >= 1),
  price_at_purchase        NUMERIC(10,2) NOT NULL,
  variant_name_at_purchase VARCHAR(100)  NOT NULL,
  product_name_at_purchase VARCHAR(255)  NOT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- ── 12. jobs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NOT NULL,
  requirements TEXT,
  location     VARCHAR(255),
  is_open      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_is_open ON jobs(is_open);

-- ── 13. job_applications ─────────────────────────────────────
CREATE TYPE IF NOT EXISTS application_status_enum AS ENUM (
  'received', 'reviewing', 'interview', 'hired', 'rejected'
);

CREATE TABLE IF NOT EXISTS job_applications (
  id              SERIAL PRIMARY KEY,
  job_id          INT                      NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_name  VARCHAR(255)             NOT NULL,
  email           VARCHAR(255)             NOT NULL,
  cv_url          TEXT,
  cover_letter    TEXT,
  status          application_status_enum  NOT NULL DEFAULT 'received',
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_email  ON job_applications(email);
