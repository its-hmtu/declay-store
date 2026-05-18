-- =============================================================
-- Declay Store — Migration 002: Alter existing tables
-- Run this ONLY if your database was created before migration 001
-- (i.e., the old Script-3.sql / article-migration.sql was applied)
-- All statements are safe to re-run (IF NOT EXISTS / IF EXISTS).
-- =============================================================

-- ── users: OAuth columns (if not already applied via oauth-migration.sql) ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id    VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ALTER  COLUMN password DROP NOT NULL;
UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ── articles: add is_published ───────────────────────────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_articles_is_published ON articles(is_published);

-- Remove the old FK from author_id → users(id) (articles are now admin-authored)
-- Only run if the FK still exists; adjust constraint name to match your DB.
-- Find the constraint name: SELECT conname FROM pg_constraint WHERE conrelid = 'articles'::regclass AND contype = 'f';
-- ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_author_id_fkey;

-- ── Drop old schema tables replaced by new modules ───────────
-- Uncomment only if you want to remove the old placeholder tables.
-- DROP TABLE IF EXISTS products_categories CASCADE;
-- DROP TABLE IF EXISTS product_options       CASCADE;
-- DROP TABLE IF EXISTS product_option_values CASCADE;
-- DROP TABLE IF EXISTS variant_option_values CASCADE;
-- DROP TABLE IF EXISTS wishlists             CASCADE;
-- DROP TABLE IF EXISTS coupons               CASCADE;
-- DROP TABLE IF EXISTS user_coupons          CASCADE;

-- Recreate products table with new schema (if still using old structure)
-- WARNING: this drops all existing product data
-- DROP TABLE IF EXISTS products CASCADE;
-- Then re-run the products + product_variants blocks from migration 001.
