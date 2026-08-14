-- =============================================================
-- Declay Store — Migration 032: attribute order lines to campaigns
--
-- Why: campaigns changed prices but left no trace on the order. Revenue could
-- not be split by campaign, and — worse for the MVP — "best selling SKU" could
-- not be separated from "SKU that happened to be on sale". Without this the
-- validation month produces numbers nobody can interpret afterwards.
--
-- What: each order line records which campaign priced it, the % applied, and
-- the money given away. All three are snapshots — editing or deleting the
-- campaign later must not rewrite history, hence ON DELETE SET NULL and the
-- denormalised percent/amount columns.
-- Safe to re-run.
-- =============================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS campaign_id INT REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_name_at_purchase VARCHAR(150),
  ADD COLUMN IF NOT EXISTS campaign_discount_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS campaign_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_at_purchase NUMERIC(10,2);

-- Reporting reads "all lines for campaign X in a period"; partial index keeps it
-- small because most lines carry no campaign.
CREATE INDEX IF NOT EXISTS idx_order_items_campaign
  ON order_items(campaign_id)
  WHERE campaign_id IS NOT NULL;

-- Backfill: existing rows predate campaign attribution. Base price is unknown
-- retroactively, so mirror the paid price and leave the discount at 0 rather
-- than inventing a number.
UPDATE order_items
   SET base_price_at_purchase = price_at_purchase
 WHERE base_price_at_purchase IS NULL;

COMMENT ON COLUMN order_items.campaign_id IS
  'Campaign that priced this line, NULL when none. SET NULL on campaign delete — the name/percent/amount snapshots preserve the history.';
COMMENT ON COLUMN order_items.base_price_at_purchase IS
  'Listed unit price before any discount, so give-away can be recomputed and audited.';
