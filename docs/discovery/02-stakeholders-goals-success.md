# 02 — Bên liên quan, Mục tiêu & Tiêu chí thành công

**Ngày:** 2026-07-17 · **Trạng thái:** Vòng 3 xong.
**Liên quan:** `01-vision-and-context.md`

---

## 1. Bên liên quan (Stakeholders)
| Vai trò | Mô tả | Hàm ý hệ thống |
|---|---|---|
| **Chủ shop (Owner/Admin)** | Quyết định sản phẩm, giá, xem doanh số | Toàn quyền + xem báo cáo |
| **Nhân sự vận hành (Staff)** | Chốt đơn, đóng gói, CSKH | **Cần phân quyền**: thao tác đơn/hàng nhưng hạn chế phần nhạy cảm (giá vốn, xoá, cấu hình) |
| **Khách hàng (B2C)** | Người mua đồ handmade | Trải nghiệm mua **mobile-first**, nhanh, dễ chia sẻ |

> Vận hành **có team/nhiều vai trò** → cần **phân quyền tối thiểu Admin ↔ Staff** ngay từ MVP (không thể bỏ qua như shop một người).

## 2. Persona (rút gọn)
- **Người mua**: đến từ **mạng xã hội (FB/IG/TikTok)**, dùng **điện thoại**, quyết định nhanh (impulse), coi trọng **độc đáo + thủ công tỉ mỉ**. → Cần: ảnh đẹp, trang sản phẩm dễ chia sẻ, checkout ngắn gọn.
- **Người vận hành**: chủ shop + vài nhân sự, cần bảng điều khiển đơn giản để **chốt đơn nhanh** và **xem sản phẩm nào bán chạy**.

## 3. Tiêu chí "kiểm chứng thành công"
Chủ shop chọn **cả 4**:
1. Đạt **số đơn tối thiểu**.
2. Đạt **doanh thu mục tiêu**.
3. **Tìm ra vài SKU bán chạy** (giả thuyết cốt lõi).
4. **Khách quay lại / phản hồi tốt**.

## 4. Ràng buộc thời gian
- **~1 tháng** để có kết quả kiểm chứng. → Ràng buộc **cứng**, ưu tiên tốc độ ra mắt.

## 5. Kênh kéo khách
- **Mạng xã hội (FB/IG/TikTok).** Hàm ý bắt buộc:
  - **Mobile-first**, tốc độ tải nhanh.
  - **Ảnh sản phẩm chất lượng** (đã có Cloudinary).
  - **Share/OG tags** (link ra FB/IG hiện ảnh + tên + giá đẹp).
  - Checkout **ít bước** (khách social hay bỏ giỏ).

## 6. Nhận định & khuyến nghị của BA (điểm căng cần chốt)
> Có **mâu thuẫn phạm vi–thời gian** cần cân bằng:
- **1 tháng** nhưng đặt **cả 4 tiêu chí** + **team nhiều vai** + **VN & quốc tế** → quá tải cho một lần kiểm chứng.
- **Khuyến nghị thu hẹp để kịp 1 tháng:**
  1. **Thị trường: chỉ VN trước** (bỏ thanh toán/vận chuyển quốc tế khỏi MVP — thêm sau khi có tín hiệu).
  2. **Tiêu chí ưu tiên**: bám giả thuyết gốc → **(3) tìm SKU bán chạy** là số 1; **(1) số đơn** để có mẫu đủ lớn. **(2) doanh thu** và **(4) khách quay lại** theo dõi nhưng khó đạt ý nghĩa trong 1 tháng.
  3. **Phân quyền**: chỉ 2 vai **Admin / Staff** (đừng làm ma trận quyền phức tạp).
  4. **Đo per-SKU**: bắt buộc có (lượt xem, thêm giỏ, đơn, doanh thu theo sản phẩm) — đây là "công cụ kiểm chứng".
- **Cần chốt con số cụ thể** cho từng tiêu chí (bao nhiêu đơn? doanh thu bao nhiêu? "bán chạy" = ngưỡng nào?) — nếu không, không thể kết luận "đã kiểm chứng".

## 7. Câu hỏi còn mở (sang vòng Phạm vi & Tính năng)
1. Chốt **VN-trước** hay giữ **VN+quốc tế** trong MVP?
2. Con số cụ thể cho mỗi tiêu chí thành công.
3. Phương thức thanh toán & giao hàng tối thiểu cho MVP VN (COD? chuyển khoản/VietQR? cổng?).
4. Danh sách tính năng MVP (MoSCoW) — vòng tiếp theo.
