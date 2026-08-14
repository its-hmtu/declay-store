-- M-06: returns within the 7-day window after delivery (BR-06).
-- NOTE: the enum value is added separately in the .js wrapper — PostgreSQL will not
-- accept ALTER TYPE ... ADD VALUE inside the same multi-statement transaction.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_reason VARCHAR(500);

-- Backfill delivery time for orders already delivered, using the shipment record.
UPDATE orders o
   SET delivered_at = s.delivered_at
  FROM order_shipments s
 WHERE s.order_id = o.id
   AND o.delivered_at IS NULL
   AND s.delivered_at IS NOT NULL;
