# 06 — Con số, Phi chức năng & Ràng buộc

**Ngày:** 2026-07-17 · **Trạng thái:** Vòng 7 xong (kết thúc discovery).
**Liên quan:** `05-product-data-dictionary.md`

---

## 1. Chốt từ khách (vòng 7)
| Chủ đề | Chốt |
|---|---|
| Số đơn "có tín hiệu" | **20–50 đơn / tháng** |
| Đổi-trả | **7 ngày** sau khi nhận |
| Ngôn ngữ | **Việt + Anh (song ngữ)** |
| Pháp lý / dữ liệu | **Cần xuất hoá đơn VAT** + **cần trang Điều khoản + Bảo mật** |

## 2. Tiêu chí thành công (đo lường được)
- **Chính (bám giả thuyết):** trong 1 tháng đạt **20–50 đơn**, và từ đó **xác định Top SKU bán chạy** (đề xuất định nghĩa: **Top 5 SKU theo số lượng bán**; "bán chạy" = nằm trong Top 5 và có ≥ N đơn — N chốt khi có dữ liệu tuần 1).
- **Phụ (theo dõi):** doanh thu, tỉ lệ khách quay lại, đánh giá tích cực.
- → Bắt buộc có **báo cáo per-SKU** (đã nêu ở `05`).

## 3. Yêu cầu phi chức năng (NFR) — cho MVP
| NFR | Yêu cầu | Vì sao |
|---|---|---|
| **Mobile-first** | Ưu tiên tuyệt đối cho điện thoại | Khách đến từ FB/IG/TikTok |
| **Tốc độ tải** | Trang sản phẩm nhẹ, ảnh tối ưu (Cloudinary) | Khách social dễ thoát |
| **Chia sẻ / OG tags** | Link ra social hiện ảnh + tên + giá | Kênh chính là social |
| **Song ngữ (VN/EN)** | i18n VN + EN | Khách chốt; chuẩn bị quốc tế |
| **Bảo mật dữ liệu cá nhân** | Bảo vệ SĐT/địa chỉ khách; trang Chính sách bảo mật | Thu thập PII + yêu cầu pháp lý |
| **Sẵn sàng cơ bản** | Uptime hợp lý, sao lưu dữ liệu đơn | Bán thật, có tiền/kho |
| **Nhật ký thao tác (audit) cơ bản** | Ghi hành động nhạy cảm (đổi giá, huỷ đơn) | Có team nhiều người |

## 4. Ràng buộc (Constraints)
- **Thời gian: ~1 tháng** tới kết quả kiểm chứng (mốc cứng).
- **Nhân sự: có team** (Admin + Staff) — phân quyền 2 vai.
- **Phụ thuộc ngoài:** VNPay + **hoá đơn VAT** đều cần **đăng ký hộ kinh doanh / thuế** (lead-time ngoài kiểm soát).
- **Ngân sách:** *chưa chốt* (mục cần xác nhận) — ảnh hưởng mức đầu tư tính năng.

## 5. Nhận định & khuyến nghị của BA (điểm căng cuối)
- **Song ngữ + hoá đơn VAT + 1 tháng** làm tăng tải. Đề xuất cân bằng:
  1. **Ngôn ngữ:** ra mắt **tiếng Việt trước**, thêm **tiếng Anh cuốn chiếu** (khi mở quốc tế). i18n dựng khung ngay nhưng chỉ dịch VN cho MVP.
  2. **Hoá đơn VAT** phụ thuộc đăng ký → **không chặn ra mắt**: giai đoạn đầu **COD + phiếu giao hàng đơn giản**; xuất hoá đơn VAT khi hộ KD/thuế sẵn sàng.
  3. **Điều khoản + Bảo mật:** trang tĩnh, làm sớm (bắt buộc vì thu PII) — chi phí thấp.
- **Ngân sách chưa rõ** → cần chốt để quyết định thuê ngoài (VNPay/GHN) hay tự làm dần.

## 6. Trạng thái các câu hỏi mở → đã đóng
- X ngày đổi-trả = **7** ✅
- Con số thành công = **20–50 đơn/tháng + Top SKU** ✅
- Ngôn ngữ = **VN+EN (VN trước)** ✅
- Pháp lý = **VAT (phụ thuộc đăng ký) + Terms/Privacy** ✅
- **Còn mở:** ngân sách cụ thể.
