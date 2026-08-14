-- M-03: cost price (admin-only, for margin) and parcel dimensions (for carrier rates).
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS cost_price   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS weight_gram  INTEGER,
  ADD COLUMN IF NOT EXISTS length_cm    INTEGER,
  ADD COLUMN IF NOT EXISTS width_cm     INTEGER,
  ADD COLUMN IF NOT EXISTS height_cm    INTEGER;
