# 12 — Kế hoạch triển khai MVP (map FR ↔ code hiện có)

**Ngày:** 2026-07-17 · **Liên quan:** `10-mvp-srs-and-design.md`, `11-mvp-bpmn-order-checkout.md`
**Nguyên tắc:** đây là **rebuild** → **cắt gọn + bổ sung** trên phần lõi đã chạy ổn, **không viết mới từ số 0**.

---

## 1. Ánh xạ FR ↔ Module/Trang ↔ Trạng thái
Ký hiệu: **KEEP** = giữ nguyên · **MOD** = sửa/hoàn thiện · **ADD** = làm mới.

| FR | Nội dung | Có sẵn (module/trang) | Trạng thái | Ghi chú |
|---|---|---|:--:|---|
| FR-01 | Danh sách SP (lọc/tìm/sort, mobile, infinite) | product, category · `products` | **KEEP** | Đã có infinite scroll + filter |
| FR-02 | Chi tiết SP (biến thể, ảnh, giá gốc/KM) | product-variant · `products/[slug]` | **KEEP** | special_price đã có |
| FR-03 | OG/share meta cho trang SP | `products/[slug]` metadata | **MOD** | Bổ sung openGraph image/tên/giá |
| FR-04 | Giỏ hàng | cart · `cart` | **KEEP** | |
| FR-05 | **Guest checkout** | `checkout` (đang bắt login) | **MOD** | Bỏ ràng buộc login; lưu liên hệ khách vãng lai |
| FR-06 | Địa chỉ + phương thức/phí ship | address, shipping-method | **KEEP** | |
| FR-07 | Thanh toán **COD** (+ VNPay sau) | payment, payment-provider | **ADD** | Chọn phương thức + nhánh COD |
| FR-08 | Tổng + giá hiệu lực + mã giảm | order.pricing, discount | **KEEP** | effectiveUnitPrice đã có |
| FR-09 | Đặt đơn (COD không trả trước) | order.service | **MOD** | Rẽ nhánh COD (không tạo Stripe intent) |
| FR-10 | Quản lý đơn Admin/Staff + mã vận đơn | order, order-shipment · `orders` | **KEEP** | |
| FR-11 | **Báo cáo per-SKU** (Top bán chạy) | (views ở product) | **ADD** | Endpoint + trang báo cáo |
| FR-12 | CRUD SP/biến thể/ảnh + **giá vốn/weight** | product, variant, upload | **MOD** | Thêm cost_price + weight/kích thước |
| FR-13 | Phân quyền Admin/Staff, **ẩn giá vốn** | role, admin-user, requireRole | **MOD** | Lọc field nhạy cảm theo vai |
| FR-14 | Trang Điều khoản + Bảo mật | page, site-setting · `terms`,`policies` | **KEEP** | |
| FR-15 | Song ngữ VN/EN (VN trước) | (hiện English-only) | **ADD** | Khung i18n + dịch VN |
| FR-16 | **VNPay** (redirect + webhook) | payment-provider (BankTransfer có) | **ADD** | VNPayProvider (sandbox trước) |
| FR-17 | **GHN/GHTK** (vận đơn + tracking) | shipping-provider (mock/easyship) | **ADD** | GHN/GHTK provider |
| FR-18 | Tài khoản khách (lịch sử đơn) | auth, user · `account`,`orders` | **KEEP** | |
| FR-19 | Review (đã mua) | product-review | **MOD** | Siết verified-purchase |
| FR-20 | Mã giảm giá (ràng buộc) | discount, coupon | **KEEP** | Đảm bảo hạn dùng + trần |
| FR-21 | **Đối soát COD** | — | **ADD** | Danh sách "delivered chưa đối soát" |
| FR-22 | Hoá đơn VAT | — | **ADD** (Should) | Phụ thuộc đăng ký hộ KD |

## 2. Cắt / Ẩn khỏi MVP (giữ code, tắt khỏi nav)
Để tập trung kiểm chứng, **ẩn** (không xoá) các phần ngoài MVP: **campaign, collection, wishlist, blog/article, careers/job, banner, chat (khách), assistant/AI**. → giảm bề mặt, tăng tốc độ ra mắt. Bật lại khi cần (COULD).

## 3. Công việc mới (M-items)
| ID | Việc | FR | Est (ngày) |
|---|---|---|:--:|
| M-01 | Guest checkout (bỏ login, lưu liên hệ khách) | FR-05/09 | 1–2 |
| M-02 | Chọn phương thức thanh toán + **nhánh COD** (order.service) | FR-07/09 | 1.5–2 |
| M-03 | `cost_price` + `weight`/kích thước biến thể (migration+entity+form) | FR-12 | 1.5 |
| M-04 | **Ẩn giá vốn/margin với Staff** ở API theo vai | FR-13 | 1 |
| M-05 | **Báo cáo per-SKU** (endpoint + trang) | FR-11 | 2 |
| M-06 | Nhánh **returned** (đổi-trả ≤ 7 ngày) | FR (BR-06) | 1.5 |
| M-07 | **Đối soát COD** (mark reconciled + danh sách) | FR-21 | 1 |
| M-08 | OG/share meta trang sản phẩm | FR-03 | 0.5 |
| M-09 | Ẩn tính năng ngoài MVP khỏi nav | §2 | 0.5 |
| M-10 | Siết review verified-purchase | FR-19 | 0.5 |
| M-11 | Khung i18n + dịch VN (EN khung) | FR-15 | 2–3 |
| M-12 | **VNPay** provider (sandbox) + webhook | FR-16 | 3–4 |
| M-13 | **GHN/GHTK** provider + tracking | FR-17 | 3–5 |
| M-14 | Hoá đơn VAT (khi có đăng ký) | FR-22 | TBD |
| | **Tổng lõi MVP (M-01→M-10)** | | **~10–12 ngày-người** |

## 4. Sprint plan 1 tháng
**Tuần 1 — Cắt gọn + nền bán COD:** M-09 (ẩn ngoài MVP) · M-01 guest checkout · M-02 COD · M-08 OG. → **Bán được bằng COD.**
**Tuần 2 — Vận hành & công cụ kiểm chứng:** M-03 giá vốn/weight · M-04 ẩn giá vốn với Staff · M-05 **báo cáo per-SKU** · M-06 return · M-07 đối soát COD · M-10 review.
**Tuần 3 — Ra mắt mềm + fast-follow:** M-11 i18n VN + đẩy traffic social; **song song** M-12 VNPay sandbox · M-13 GHN/GHTK.
**Tuần 4 — Bật tích hợp + đo:** bật VNPay/GHN khi merchant sẵn sàng · M-14 VAT khi có đăng ký · **đo 20–50 đơn + Top SKU → kết luận kiểm chứng**.

> Nếu đăng ký hộ KD trễ: **vẫn ra mắt tuần 1–2 bằng COD**; VNPay/GHN/VAT trượt sang sau, không chặn kiểm chứng.

## 5. Phụ thuộc & rủi ro
- **Đăng ký hộ KD** (mở VNPay + VAT) — lead-time ngoài kiểm soát → COD-first.
- **Cân nặng biến thể** cần cho GHN/GHTK — thu thập khi nhập hàng (M-03).
- **Ngân sách** chưa chốt — ảnh hưởng chọn thuê ngoài vs tự làm M-12/M-13.
- Rủi ro kỹ thuật khi sửa checkout (guest + COD) → có test luồng tiền/kho sẵn (33+ test) để hồi quy.

## 6. Definition of Done (MVP)
- Khách **mua được bằng COD** (guest), đơn chạy đúng vòng đời (`processing→shipped→delivered`, cancel/return).
- **Chống oversell** + giữ chỗ tồn hoạt động (có test).
- **Báo cáo per-SKU** cho ra Top SKU.
- **Staff không thấy** giá vốn/margin.
- Trang **Điều khoản/Bảo mật** xuất bản; SP có **OG meta**.
- Tính năng ngoài MVP đã **ẩn**.
- (Fast-follow, không chặn go-live) VNPay/GHN/VAT/i18n-EN bật khi sẵn sàng.
