-- =============================================================
-- Declay Store — Migration 030: hệ gợi ý sản phẩm (M-35)
-- Xem docs/business-analysis/08. An toàn chạy lại (IF NOT EXISTS).
-- =============================================================

-- Cặp sản phẩm hay MUA CHUNG, dựng lại định kỳ từ order_items bởi job nền.
CREATE TABLE IF NOT EXISTS product_cooccurrence (
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  co_product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score         NUMERIC NOT NULL,          -- số đơn xuất hiện cùng
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, co_product_id)
);
CREATE INDEX IF NOT EXISTS idx_cooc_product ON product_cooccurrence(product_id, score DESC);

-- Sự kiện xem sản phẩm theo người (M-35, P-Q2): user_id nếu đăng nhập, session
-- nếu vãng lai. Phục vụ gợi ý theo hành vi duyệt (Phase 2). ⚠️ Thu thập hành vi
-- -> cần rà chính sách riêng tư/consent trước khi bật thu ở FE.
CREATE TABLE IF NOT EXISTS product_view_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_view_user    ON product_view_events(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_session ON product_view_events(session_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_product ON product_view_events(product_id);
