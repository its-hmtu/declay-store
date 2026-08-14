-- =============================================================
-- Declay Store — Migration 004: Add date_of_birth to users
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
