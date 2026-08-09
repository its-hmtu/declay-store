-- =============================================================
-- Declay Store — Migration 035: cover image for a collection
--
-- Why a column and not a banner table: the banner module's value is SCHEDULING
-- and rotation. A campaign needs that because it expires. A collection is
-- evergreen — "Air Force 1" has no end date — so all that machinery would be
-- dead weight plus one more thing an admin must remember to switch off.
--
-- One image earns its keep in three places at once: the home-page carousel and
-- the collections index (both text-only today), the collection page header, and
-- the Open Graph card when a collection link is shared. That last one matters for
-- a shop whose customers arrive from Facebook, Instagram and TikTok — right now
-- those links preview as a blank card.
--
-- Safe to re-run.
-- =============================================================

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN collections.image_url IS
  'Cover image (Cloudinary). Used by the home carousel, the collections index, the collection page header and the OG share card.';
