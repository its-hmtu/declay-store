-- =============================================================
-- Declay Store — Migration 031: đo lường gợi ý (M-35, CTR)
-- Ghi impression (được phục vụ) và click để tính click-through.
-- Xem docs/business-analysis/08 §17. An toàn chạy lại (IF NOT EXISTS).
-- =============================================================

-- Mỗi hàng = 1 sự kiện: 'impression' (một sản phẩm được đưa ra gợi ý) hoặc
-- 'click' (khách bấm vào sản phẩm gợi ý). CTR theo ngữ cảnh = click / impression.
CREATE TABLE IF NOT EXISTS recommendation_events (
  id         BIGSERIAL PRIMARY KEY,
  kind       VARCHAR(12) NOT NULL,     -- 'impression' | 'click'
  context    VARCHAR(24) NOT NULL,     -- cart | detail | post_purchase | home | account
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reco_ev_ctx_kind ON recommendation_events(context, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reco_ev_product  ON recommendation_events(product_id, kind);
