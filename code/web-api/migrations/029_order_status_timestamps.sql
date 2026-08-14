-- =============================================================
-- Declay Store — Migration 029: mốc thời gian trạng thái đơn (M-30)
-- Lưu thời điểm THANH TOÁN thành công và bắt đầu XỬ LÝ để dòng thời gian ở trang
-- chi tiết đơn hiển thị giờ thật cho mốc paid/processing. An toàn chạy lại.
-- =============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;

-- Backfill: paid_at lấy từ khoản thanh toán đã thành công (chỉ đơn trả trước có,
-- COD không). processing_at xấp xỉ bằng thời điểm tạo đơn cho đơn đã qua xử lý.
UPDATE orders o
   SET paid_at = p.updated_at
  FROM payments p
 WHERE p.order_id = o.id
   AND p.status = 'succeeded'
   AND o.paid_at IS NULL;

UPDATE orders
   SET processing_at = created_at
 WHERE status IN ('processing', 'shipped', 'delivered', 'returned')
   AND processing_at IS NULL;
