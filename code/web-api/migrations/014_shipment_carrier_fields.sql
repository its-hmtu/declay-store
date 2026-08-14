ALTER TABLE order_shipments
  ALTER COLUMN carrier DROP NOT NULL,
  ALTER COLUMN tracking_number DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider             VARCHAR(30)  NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_shipment_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS status               VARCHAR(40)  NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS incoterm             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS label_url            VARCHAR(500),
  ADD COLUMN IF NOT EXISTS cost                 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency             VARCHAR(3),
  ADD COLUMN IF NOT EXISTS last_event           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_event_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pod_url              VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_order_shipments_provider_sid ON order_shipments(provider_shipment_id);
