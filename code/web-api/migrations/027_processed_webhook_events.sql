-- =============================================================
-- Declay Store — Migration 027: Idempotency webhook (W-01)
-- Sổ ghi sự kiện webhook đã xử lý, để chặn xử lý lặp ở TẦNG WEBHOOK (bổ sung cho
-- guard trạng thái ở markAsPaid). Dùng chung cho Stripe/VNPay/GHN và các sự kiện
-- hoàn tiền sắp tới (M-29). An toàn chạy lại.
-- =============================================================

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id           BIGSERIAL PRIMARY KEY,
  provider     VARCHAR(20)  NOT NULL,                 -- stripe | vnpay | ghn
  event_id     VARCHAR(255) NOT NULL,                 -- id sự kiện của cổng, hoặc khoá suy ra
  event_type   VARCHAR(80),
  order_id     INT REFERENCES orders(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Một sự kiện (theo cổng) chỉ được ghi MỘT lần → nền tảng cho claim() idempotent.
  CONSTRAINT uq_webhook_event UNIQUE (provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON processed_webhook_events(order_id);
