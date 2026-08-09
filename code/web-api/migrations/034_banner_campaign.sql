-- =============================================================
-- Declay Store — Migration 034: tie a banner to a campaign
--
-- Why: campaigns are invisible to customers today. The banner module already has
-- everything a campaign promo needs (image, link, schedule, position), so the
-- marketing surface is a wiring problem, not a new feature.
--
-- Linking the two means the banner disappears the moment the campaign stops
-- running. Relying on an admin to remember to switch a banner off is how shops end
-- up advertising a sale that no longer applies — and the checkout would charge
-- full price, because pricing reads the campaign window, not the banner.
--
-- ON DELETE SET NULL, not CASCADE: deleting a campaign should orphan the banner,
-- not silently destroy artwork somebody paid for.
-- Safe to re-run.
-- =============================================================

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS campaign_id INT REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_banners_campaign
  ON banners(campaign_id)
  WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN banners.campaign_id IS
  'Optional campaign this banner promotes. When set, the banner is only served while that campaign is inside its active window — no manual switch-off.';
