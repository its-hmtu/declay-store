-- M-12 FX: chốt tỉ giá và số tiền thực thu tại thời điểm tạo đơn.
-- Lý do: nếu IPN tính lại tỉ giá tại thời điểm callback, chỉ cần đổi
-- VNPAY_USD_TO_VND là mọi đơn đang chờ sẽ lệch số tiền -> RspCode 04 ->
-- khách đã trả tiền nhưng đơn không được ghi nhận.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS charged_amount   NUMERIC(18,2),   -- số tiền gửi cho cổng (VND)
  ADD COLUMN IF NOT EXISTS charged_currency VARCHAR(3),      -- 'VND'
  ADD COLUMN IF NOT EXISTS fx_rate          NUMERIC(18,6);   -- USD -> charged_currency
COMMENT ON COLUMN payments.charged_amount   IS 'Số tiền thực gửi cổng thanh toán, đơn vị charged_currency. Chốt khi tạo đơn.';
COMMENT ON COLUMN payments.fx_rate          IS 'Tỉ giá quy đổi từ payments.currency sang charged_currency tại thời điểm tạo đơn.';
