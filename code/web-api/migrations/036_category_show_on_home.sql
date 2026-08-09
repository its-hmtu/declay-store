-- =============================================================
-- Declay Store — Migration 036: pick which categories appear on the home page
--
-- Why a flag and not a heuristic: `categories` has no ordering column and no
-- notion of importance, so any automatic rule ("most products", "alphabetical")
-- would be the code guessing at merchandising. Which categories deserve the home
-- page is a shop decision that changes with the season — it belongs to the admin,
-- with a switch, not to a sort function.
--
-- Defaults to FALSE: turning this on must be a deliberate act, otherwise every
-- category would land on the home page the moment this ships.
-- Safe to re-run.
-- =============================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT FALSE;

-- The storefront asks for "the categories flagged for the home page" on every
-- render; a partial index keeps that lookup off a full scan.
CREATE INDEX IF NOT EXISTS idx_categories_show_on_home
  ON categories(show_on_home)
  WHERE show_on_home = TRUE;

COMMENT ON COLUMN categories.show_on_home IS
  'Admin-controlled: show this category as a product row on the home page. Ordered by name; empty categories are skipped at render time.';
