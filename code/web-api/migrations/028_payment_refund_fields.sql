-- =============================================================
-- Declay Store — Migration 028: dữ liệu cần cho hoàn tiền VNPay (M-29b)
-- API hoàn tiền VNPay cần vnp_TxnRef gốc + vnp_PayDate (ngày giao dịch) — cả hai
-- có trong callback thanh toán nhưng trước đây không lưu. An toàn chạy lại.
-- =============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_txn_ref  VARCHAR(100),   -- vnp_TxnRef gốc "<orderId>-<ts>"
  ADD COLUMN IF NOT EXISTS provider_pay_date VARCHAR(20);    -- vnp_PayDate yyyyMMddHHmmss (GMT+7)
