-- =============================================================
-- Declay Store — Migration 005: Add views counter to products
-- Powers the "trending" / "most viewed" product metrics & sort.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
