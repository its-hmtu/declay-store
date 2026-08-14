-- M-13: phường/xã cũng có SupportType riêng (0:Lock 1:Take/Pay 2:Deliver 3:Take/Deliver/Pay).
-- Một quận mở nhưng vẫn có phường bị khoá — nếu chỉ kiểm tra ở cấp quận thì khách
-- chọn được phường không giao tới, đến bước tạo vận đơn mới lỗi.
ALTER TABLE ghn_wards
  ADD COLUMN IF NOT EXISTS support_type SMALLINT NOT NULL DEFAULT 3;

-- Dịch vụ khả dụng theo tuyến (from_district -> to_district), cache lại vì
-- available-services trả kết quả khác nhau tuỳ tuyến và ít thay đổi.
CREATE TABLE IF NOT EXISTS ghn_services (
  from_district_id INTEGER     NOT NULL,
  to_district_id   INTEGER     NOT NULL,
  service_id       INTEGER     NOT NULL,
  service_type_id  SMALLINT    NOT NULL,
  short_name       VARCHAR(60),
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_district_id, to_district_id, service_id)
);
