-- M-15: chuyển toàn hệ thống sang niêm yết VND (thị trường trong nước).
--
-- Vì sao: cửa hàng niêm yết USD nhưng VNPay chỉ nhận VND và GHN chỉ báo phí
-- bằng VND. Giữ USD nghĩa là duy trì hai lớp quy đổi ở hai chỗ khác nhau —
-- đúng nhóm lỗi đã khiến đơn $350 bị gửi sang cổng thành 350đ.
--
-- Bước 1: nới kiểu cột. NUMERIC(10,2) chỉ chứa tới ~99,9 triệu đồng;
-- một đơn nhiều món hoặc ngưỡng miễn phí ship có thể vượt.
ALTER TABLE product_variants ALTER COLUMN price          TYPE NUMERIC(14,2);
ALTER TABLE product_variants ALTER COLUMN special_price  TYPE NUMERIC(14,2);
ALTER TABLE product_variants ALTER COLUMN cost_price     TYPE NUMERIC(14,2);
ALTER TABLE orders           ALTER COLUMN total_amount   TYPE NUMERIC(14,2);
ALTER TABLE orders           ALTER COLUMN subtotal       TYPE NUMERIC(14,2);
ALTER TABLE orders           ALTER COLUMN shipping_fee   TYPE NUMERIC(14,2);
ALTER TABLE orders           ALTER COLUMN discount_amount TYPE NUMERIC(14,2);
ALTER TABLE order_items      ALTER COLUMN price_at_purchase TYPE NUMERIC(14,2);
ALTER TABLE discount_codes   ALTER COLUMN value            TYPE NUMERIC(14,2);
ALTER TABLE discount_codes   ALTER COLUMN min_order_amount TYPE NUMERIC(14,2);
ALTER TABLE payments         ALTER COLUMN amount           TYPE NUMERIC(14,2);
ALTER TABLE payments         ALTER COLUMN reconciled_amount TYPE NUMERIC(14,2);
ALTER TABLE refunds          ALTER COLUMN amount           TYPE NUMERIC(14,2);
ALTER TABLE shipping_methods ALTER COLUMN fee       TYPE NUMERIC(14,2);
ALTER TABLE shipping_methods ALTER COLUMN free_over TYPE NUMERIC(14,2);

-- Bước 2: đơn vị tiền mặc định của bản ghi thanh toán.
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'vnd';
