-- =============================================================
-- Declay Store — Migration 008: static pages CMS (legal & info pages)
-- `pages` holds editable static pages (terms, policies, ...) with a version
-- counter + effective date; `page_versions` keeps a snapshot of every save.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- =============================================================

CREATE TABLE IF NOT EXISTS pages (
  id             SERIAL PRIMARY KEY,
  slug           VARCHAR(100) NOT NULL UNIQUE,
  title          VARCHAR(255) NOT NULL,
  body           TEXT NOT NULL,
  is_published   BOOLEAN NOT NULL DEFAULT FALSE,
  effective_date DATE,
  version        INT NOT NULL DEFAULT 1,
  updated_by     INT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_versions (
  id             BIGSERIAL PRIMARY KEY,
  page_id        INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version        INT NOT NULL,
  title          VARCHAR(255) NOT NULL,
  body           TEXT NOT NULL,
  effective_date DATE,
  is_published   BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by      INT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id, version DESC);

-- Seed the two legal pages (template content; edit from admin later).
INSERT INTO pages (slug, title, body, is_published, version)
VALUES
  ('terms', 'Terms & Conditions',
   '<p><em>This is a template. Replace with the official terms.</em></p><h2>1. Acceptance of Terms</h2><p>By creating an account and using Declay Store, you agree to comply with these terms.</p><h2>2. Account</h2><p>You are responsible for keeping your login credentials secure.</p><h2>3. Orders &amp; Payment</h2><p>Orders are confirmed only after payment succeeds.</p><h2>4. Shipping &amp; Returns</h2><p>See the Store Policies page.</p><h2>5. Contact</h2><p>Contact Declay Store support with any questions.</p>',
   TRUE, 1),
  ('policies', 'Store Policies',
   '<p><em>This is a template. Replace with the official policies.</em></p><h2>Privacy Policy</h2><p>We collect information to process orders and support customers, and do not sell your data.</p><h2>Shipping Policy</h2><p>Delivery time and fees vary by region; a tracking number is provided once your order ships.</p><h2>Returns &amp; Refunds Policy</h2><p>Items may be returned within the stated period if in original condition; refunds go to the original payment method.</p>',
   TRUE, 1)
ON CONFLICT (slug) DO NOTHING;
