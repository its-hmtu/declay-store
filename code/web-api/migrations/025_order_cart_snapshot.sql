-- M-20: nhớ giỏ hàng nào đã sinh ra đơn này.
--
-- Vì sao cần: giỏ hàng chỉ được xoá KHI thanh toán thành công (thất bại thì
-- khách phải còn giỏ để thử lại). Nhưng lúc ghi nhận thanh toán, đơn của khách
-- vãng lai không có cách nào tìm lại giỏ: giỏ khách vãng lai gắn với
-- session_id, còn đơn hàng không lưu session_id.
--
-- Hậu quả trước khi sửa: khách vãng lai trả tiền qua VNPay xong, giỏ vẫn còn
-- nguyên hàng — dễ đặt trùng đơn.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_id INTEGER;
COMMENT ON COLUMN orders.cart_id IS 'Giỏ hàng đã sinh ra đơn. Dùng để xoá giỏ khi thanh toán thành công.';
