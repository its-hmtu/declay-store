-- M-16: mã đơn hàng cho người dùng, thay cho việc phơi id cơ sở dữ liệu.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(20);

-- Cấp mã cho các đơn đã có. Dùng ngày tạo thật của đơn để mã phản ánh đúng
-- thời điểm đặt, và id để đảm bảo không trùng nhau.
UPDATE orders SET order_code = 'DC-'
  || to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDD')
  || '-' || lpad(to_hex(id), 4, '2')
WHERE order_code IS NULL;

ALTER TABLE orders ALTER COLUMN order_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);

-- M-13d: vận đơn GHN.
-- order_shipments ĐÃ CÓ provider / provider_shipment_id / tracking_number /
-- cost / estimated_delivery_at — dùng lại thay vì thêm cột trùng nghĩa.
-- GHN dùng CHÍNH order_code làm mã tra cứu, nên nó vừa là provider_shipment_id
-- vừa là tracking_number.
ALTER TABLE order_shipments
  ADD COLUMN IF NOT EXISTS raw_response JSONB;

COMMENT ON COLUMN orders.order_code IS 'Mã hiển thị cho khách (DC-YYMMDD-XXXX). Không dùng id trên giao diện.';
COMMENT ON COLUMN order_shipments.raw_response IS 'Phản hồi gốc của hãng vận chuyển, giữ để đối soát khi có tranh chấp.';
