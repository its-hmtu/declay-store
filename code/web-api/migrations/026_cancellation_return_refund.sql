-- =============================================================
-- Declay Store — Migration 026: Huỷ đơn & Đổi/Hoàn hàng (M-29a)
-- Dựng khung dữ liệu cho luồng huỷ đơn có duyệt và trả hàng lỗi theo món.
-- An toàn chạy lại (IF NOT EXISTS). Xem docs/business-analysis/07.
-- =============================================================

-- ── orders: cờ "đã trả một phần" (P13). KHÔNG thêm giá trị enum status. ──
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS partial_returned BOOLEAN NOT NULL DEFAULT false;

-- ── Yêu cầu huỷ đơn (khi đã có vận đơn GHN — cần admin duyệt, UC-C2/C3) ──
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id                BIGSERIAL PRIMARY KEY,
  order_id          INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by      INT REFERENCES users(id) ON DELETE SET NULL,     -- null = admin tạo hộ
  reason            VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',           -- pending|approved|rejected|needs_manual
  ghn_cancel_result JSONB,                                            -- phản hồi GHN khi huỷ vận đơn
  refund_id         BIGINT REFERENCES refunds(id) ON DELETE SET NULL,
  resolved_by       INT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cancel_req_order ON cancellation_requests(order_id);
-- BR/A4: mỗi đơn chỉ một yêu cầu huỷ đang mở.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cancel_req_open
  ON cancellation_requests(order_id) WHERE status = 'pending';

-- ── Yêu cầu trả hàng lỗi/sai (UC-R1..R3) ──
CREATE TABLE IF NOT EXISTS return_requests (
  id                     BIGSERIAL PRIMARY KEY,
  order_id               INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by           INT REFERENCES users(id) ON DELETE SET NULL,
  type                   VARCHAR(20) NOT NULL DEFAULT 'defective',    -- defective|wrong_item
  status                 VARCHAR(20) NOT NULL DEFAULT 'pending',      -- pending|approved|rejected|awaiting_return|received|refunded|expired
  return_tracking_number VARCHAR(255),                               -- vận đơn trả GHN (shop tạo, P10)
  refund_bank_info       JSONB,                                       -- hoàn CK/COD: tên, số TK, ngân hàng (A3)
  refund_id              BIGINT REFERENCES refunds(id) ON DELETE SET NULL,
  resolved_by            INT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_return_req_order ON return_requests(order_id);
-- BR/A4: mỗi đơn chỉ một yêu cầu trả đang mở (chưa đóng).
CREATE UNIQUE INDEX IF NOT EXISTS uq_return_req_open
  ON return_requests(order_id)
  WHERE status IN ('pending', 'approved', 'awaiting_return', 'received');

-- ── Chi tiết trả theo món (P6, trả từng dòng) ──
CREATE TABLE IF NOT EXISTS return_request_items (
  id                BIGSERIAL PRIMARY KEY,
  return_request_id BIGINT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id     INT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity          INT NOT NULL,
  reason            VARCHAR(255),
  photo_urls        JSONB NOT NULL DEFAULT '[]'::jsonb,               -- BR-R2: bắt buộc >=1 (kiểm ở tầng service)
  item_status       VARCHAR(20) NOT NULL DEFAULT 'requested',         -- requested|approved|rejected|received
  refund_amount     NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_return_item_req  ON return_request_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_item_oi   ON return_request_items(order_item_id);

-- ── refunds: tổng quát hoá đa kênh + liên kết yêu cầu (§9.4) ──
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS method                  VARCHAR(20),        -- vnpay|stripe|bank_transfer
  ADD COLUMN IF NOT EXISTS provider                VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider_ref            VARCHAR(255),       -- mã hoàn của cổng
  ADD COLUMN IF NOT EXISTS type                    VARCHAR(20),        -- cancel|return
  ADD COLUMN IF NOT EXISTS cancellation_request_id BIGINT REFERENCES cancellation_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS return_request_id       BIGINT REFERENCES return_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiated_by            INT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency                VARCHAR(10) NOT NULL DEFAULT 'vnd',
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_refunds_cancel_req ON refunds(cancellation_request_id);
CREATE INDEX IF NOT EXISTS idx_refunds_return_req ON refunds(return_request_id);
