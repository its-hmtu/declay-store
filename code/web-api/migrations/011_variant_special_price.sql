-- =============================================================
-- Declay Store — Migration 011: per-variant special (sale) price
-- Increment 1 of the pricing features. Nullable: when set and lower than
-- the base price, it becomes the effective unit price at checkout & display.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS special_price NUMERIC(10,2);
