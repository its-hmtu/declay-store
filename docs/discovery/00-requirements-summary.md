# 00 — Tổng hợp Yêu cầu (Requirements Summary)

**Ngày:** 2026-07-17 · **Nguồn:** discovery vòng 1–7 (`01`→`06`).
**Vai trò:** BA phỏng vấn khách hàng, làm lại từ đầu.

> Đây là bản tóm tắt một trang. Chi tiết ở các file `01`–`06` cùng thư mục.

---

## 1. Sản phẩm là gì (một đoạn)
Website **e-commerce B2C** bán **đồ handmade / thủ công** (chất lượng cao, độc bản), **làm lại từ đầu**. Mục tiêu 1 tháng: **kiểm chứng "sản phẩm nào bán chạy"**, khách đến từ **mạng xã hội**, vận hành **có team (Admin/Staff)**, **thị trường VN trước**.

## 2. Điều cần kiểm chứng & thước đo
- **Giả thuyết:** SKU nào bán chạy.
- **Thành công:** **20–50 đơn/tháng** + xác định **Top 5 SKU** theo số lượng bán. Theo dõi thêm: doanh thu, khách quay lại, review.
- **Công cụ bắt buộc:** **báo cáo per-SKU** (xem/thêm giỏ/bán/doanh thu).

## 3. Phạm vi MVP (MoSCoW rút gọn)
**MUST (ra mắt):** catalog + biến thể + ảnh đẹp + trang SP mobile/OG · giỏ + **guest checkout** · **COD** · quản lý đơn Admin/Staff + nhập mã vận đơn · **báo cáo per-SKU** · trang **Điều khoản/Bảo mật**.
**SHOULD (cuốn chiếu):** **VNPay** (phụ thuộc đăng ký) · **GHN/GHTK** tự động (khởi đầu nhập mã tay) · tài khoản khách · review (đã mua) · mã giảm giá · **hoá đơn VAT** (phụ thuộc đăng ký) · **tiếng Anh** (VN trước).
**COULD:** quốc tế, campaign/collection, wishlist, blog, AI/chatbot.
**WON'T (nay):** đa cổng/hãng phức tạp, RMA đầy đủ, dashboard sâu, ma trận quyền nhiều cấp.

## 4. Nghiệp vụ cốt lõi
- **Vòng đời đơn:** (VNPay) pending_payment → processing; (COD) → processing ngay → **shipped (bắt buộc mã vận đơn)** → delivered; nhánh **cancelled** (trước ship) và **returned** (trong **7 ngày**).
- **Tồn kho theo biến thể**, giữ chỗ khi đặt, chống oversell.
- **Giá:** giá gốc + giá KM; **giá vốn/margin chỉ Admin** (ẩn với Staff).
- **COD:** thu khi giao, cần đối soát; rủi ro "bom hàng" (staff huỷ nhanh đơn nghi ngờ).

## 5. Dữ liệu chính
Product (name, slug, mô tả, category, material, is_active, views) · **ProductVariant** (price, special_price, **cost_price[admin]**, **stock**, **weight/kích thước[cho ship]**, images) · Category. Chi tiết ở `05`.

## 6. Phi chức năng & ràng buộc
Mobile-first · tốc độ · OG/share · **song ngữ (VN trước)** · bảo mật PII · audit cơ bản. Ràng buộc: **1 tháng**, team 2 vai, **VNPay & VAT phụ thuộc đăng ký hộ KD** (lead-time), **ngân sách chưa chốt**.

## 7. Khuyến nghị của BA (đường tới ra mắt nhanh)
1. **Ra mắt bằng MUST + COD** (chạy ngay, không chờ đăng ký).
2. **VNPay, GHN/GHTK, hoá đơn VAT, tiếng Anh** làm **cuốn chiếu** khi phụ thuộc sẵn sàng.
3. Vì là **rebuild**, **tái dùng phần lõi đã chạy ổn** của bản cũ (catalog/variant/cart/order/admin/review/discount/account) và **chỉ bổ sung**: `cost_price` (admin-only), `weight`/kích thước, **báo cáo per-SKU**, luồng **COD**, nhánh **returned**, cắt bỏ tính năng ngoài MVP.

## 8. Việc còn phải chốt
- **Ngân sách** cụ thể (quyết định thuê ngoài vs tự làm dần).
- **Ngưỡng N đơn** để gọi một SKU là "bán chạy" (chốt sau tuần 1 khi có dữ liệu).
- Tiến độ **đăng ký hộ kinh doanh** (mở khoá VNPay + VAT).

---
### Chỉ mục tài liệu discovery
- `01-vision-and-context.md` — Tầm nhìn & bối cảnh
- `02-stakeholders-goals-success.md` — Bên liên quan, mục tiêu, tiêu chí
- `03-scope-and-mvp.md` — Phạm vi & MoSCoW
- `04-order-process-and-lifecycle.md` — Quy trình & vòng đời đơn
- `05-product-data-dictionary.md` — Dữ liệu sản phẩm
- `06-nfr-constraints-and-metrics.md` — Phi chức năng, ràng buộc, con số
