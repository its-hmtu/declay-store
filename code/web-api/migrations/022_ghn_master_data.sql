-- M-13a: dữ liệu địa giới của GHN.
--
-- Vì sao phải lưu: API tính phí của GHN bắt buộc `to_district_id` (số) và
-- `to_ward_code` (chuỗi mã) lấy từ bộ dữ liệu riêng của họ. Địa chỉ dạng text
-- tự do ("Quận 1" / "Q.1" / "Quan 1") không gọi được API. Cache lại để không
-- phải gọi GHN mỗi lần khách mở form địa chỉ.

CREATE TABLE IF NOT EXISTS ghn_provinces (
  province_id  INTEGER      PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(20),
  synced_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ghn_districts (
  district_id  INTEGER      PRIMARY KEY,
  province_id  INTEGER      NOT NULL REFERENCES ghn_provinces(province_id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  -- 0:Lock 1:Take/Pay 2:Deliver 3:Take/Deliver/Pay — quận bị khoá thì không giao được.
  support_type SMALLINT     NOT NULL DEFAULT 3,
  synced_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ghn_districts_province ON ghn_districts(province_id);

CREATE TABLE IF NOT EXISTS ghn_wards (
  ward_code    VARCHAR(20)  NOT NULL,
  district_id  INTEGER      NOT NULL REFERENCES ghn_districts(district_id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  synced_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ward_code, district_id)
);
CREATE INDEX IF NOT EXISTS idx_ghn_wards_district ON ghn_wards(district_id);

-- Mã địa giới gắn vào địa chỉ. Vẫn giữ các cột text cũ để hiển thị và để
-- không phá vỡ địa chỉ đã lưu trước đây.
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS ghn_province_id INTEGER,
  ADD COLUMN IF NOT EXISTS ghn_district_id INTEGER,
  ADD COLUMN IF NOT EXISTS ghn_ward_code   VARCHAR(20);

-- Chốt lại phí và dịch vụ GHN trên đơn: biểu phí GHN đổi theo thời gian,
-- đơn cũ phải giữ đúng con số đã báo cho khách (cùng bài học với VNPay).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_carrier      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ghn_service_id        INTEGER,
  ADD COLUMN IF NOT EXISTS ghn_service_type_id   SMALLINT,
  ADD COLUMN IF NOT EXISTS shipping_fee_quoted   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS shipping_weight_gram  INTEGER;
