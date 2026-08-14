# 03 — Phạm vi & MVP (Scope & MoSCoW)

**Ngày:** 2026-07-17 · **Trạng thái:** Vòng 4 xong.
**Liên quan:** `01-vision-and-context.md`, `02-stakeholders-goals-success.md`

---

## 1. Quyết định phạm vi (khách hàng chốt)
| Hạng mục | Chốt |
|---|---|
| **Thị trường MVP** | ✅ **Chỉ VN trước** (mở quốc tế sau) |
| **Thanh toán** | **COD** + **Cổng VNPay** |
| **Giao hàng** | **Tích hợp GHN/GHTK** |
| **Tính năng bắt buộc (khách chọn)** | Tài khoản khách · Báo cáo bán chạy · Review · Mã giảm giá |
| **Bổ sung 2026-08-05** | ✅ **Journals** (blog/articles) · ✅ **Careers** (tuyển dụng + ứng tuyển) — đã có code, đưa vào MUST |
| **Bổ sung 2026-08-06** | ✅ **Chatbot AI** cho khách · ✅ **AI Assistant** cho Admin · ✅ **Chat real-time khách ↔ nhân viên** — đưa vào MUST |

## 2. MoSCoW (đề xuất của BA để KỊP 1 THÁNG)
> Danh sách khách chọn khá rộng cho 1 tháng. BA đề xuất **phân tầng lại** để ra mắt nhanh và bắt đầu thu dữ liệu kiểm chứng sớm; các mục còn lại làm ngay sau (fast-follow).

**MUST — ra mắt để bắt đầu kiểm chứng**
- Danh mục sản phẩm + biến thể + **ảnh đẹp** (Cloudinary), trang sản phẩm **mobile-first** + **share/OG tags** (khách đến từ FB/IG/TikTok).
- Giỏ hàng + **checkout ngắn** + **Guest checkout** (mua không cần tài khoản — giảm ma sát cho khách social).
- **COD** (chạy được ngay, không phụ thuộc đăng ký).
- Quản lý đơn cho **Admin/Staff (2 vai)**: đổi trạng thái, nhập mã vận đơn.
- **Báo cáo per-SKU bán chạy** (lượt xem, thêm giỏ, đơn, doanh thu theo SKU) — *công cụ kiểm chứng cốt lõi*.
- **Journals** (blog/articles): trang danh sách + chi tiết bài viết công khai (slug, đếm lượt xem), Admin CRUD + bật/tắt publish. *Kênh SEO/organic cho khách social — module `article` đã build xong cả BE lẫn FE.*
- **Careers**: trang tuyển dụng công khai (danh sách job đang mở + chi tiết), **form ứng tuyển** (tên, email, **upload CV**, thư ứng tuyển), Admin quản lý job + **pipeline trạng thái ứng viên**. *Module `job` + `job-application` + upload CV công khai đã build xong.*
- **Chatbot AI cho khách**: widget trên storefront, trả lời sản phẩm/chính sách/vận chuyển bằng dữ liệu thật (tool `search_products`), tra cứu đơn cho khách đã đăng nhập (`get_order_status`, `list_my_orders`). **Chỉ đọc** — không thể đặt/sửa đơn. *Module `chat` đã có; bổ sung 2026-08-06: tool `list_my_orders` và sửa system prompt đang nói sai chính sách.*
- **AI Assistant cho Admin**: trợ lý tool-use trong dashboard (tạo/sửa sản phẩm, danh mục, tra đơn…), **cổng xác nhận** cho thao tác nguy hiểm (đổi trạng thái đơn, publish bài, xoá sản phẩm), giới hạn `admin`/`super_admin`. *Module `assistant` đã có.*
- **Chat real-time khách ↔ nhân viên**: khách bấm **"Talk to a person"** ngay trong widget chatbot → hội thoại **giữ nguyên session**, nhân viên đọc được toàn bộ những gì khách đã nói. Nhân viên nhận việc ở `/admin/inbox`, trả lời real-time. **Guest dùng được, không cần tài khoản.** Ngoài giờ: tin nhắn vào hàng đợi + email báo staff, khách để email để nhận trả lời.
  - Công nghệ: **SSE + Redis pub/sub** (tái dùng hạ tầng có sẵn, không thêm dependency).

**SHOULD — fast-follow (trong/ngay sau tháng đầu)**
- **VNPay** — *phụ thuộc đăng ký hộ kinh doanh* (xem rủi ro §4).
- **GHN/GHTK** tạo vận đơn + tracking tự động (khởi đầu bằng **nhập mã tay**).
- **Tài khoản khách** (lịch sử đơn) — bổ sung trên nền guest checkout.
- **Đánh giá/review** (chỉ cho người đã mua).
- **Mã giảm giá** cơ bản.

**COULD — sau khi có tín hiệu thị trường**
- Quốc tế (thanh toán/vận chuyển/hải quan/DDP), khuyến mãi nâng cao (campaign/collection), wishlist.
- **Journals nâng cao**: tag bài viết, bài viết song ngữ, lịch xuất bản.
- **Chat nâng cao**: typing indicator, gửi ảnh/file trong chat, chuyển hội thoại giữa các nhân viên, giờ làm việc cấu hình được, đo CSAT sau hội thoại.

> **Ghi chú thay đổi (2026-08-06):** **chatbot/AI** trước đây nằm ở COULD nay **nâng lên MUST**, tách thành ba mục: chatbot khách, AI assistant admin, và chat real-time khách ↔ nhân viên. Hai mục đầu đã có code từ trước (`chat`, `assistant`); mục thứ ba là mới. Rủi ro cần theo dõi: **chi phí Claude API** (đã có rate-limit trên cả hai route) và **Render free plan tự ngủ khi không có traffic** — làm SSE đứt kết nối, khách sẽ thấy "Connection lost". Xem `05-implementation-workplan.md` W-51.
>
> **Ghi chú thay đổi (2026-08-05):** "blog/câu chuyện" trước đây nằm ở COULD nay **nâng lên MUST** dưới tên **Journals**; **Careers** trước đây không có trong danh sách nay **thêm vào MUST**. Lý do: cả hai đã được implement đầy đủ trong bản rebuild (module `article`, `job`, `job-application` + các trang `/blog`, `/careers`, `/admin/articles`, `/admin/jobs`), nên chi phí đưa vào MVP gần bằng 0.

**WON'T (giai đoạn này)**
- Đa cổng/đa hãng phức tạp, đổi–trả (RMA), hoá đơn điện tử, dashboard phân tích sâu, ma trận phân quyền nhiều cấp.

## 3. Tận dụng lại (đây là REBUILD, không phải greenfield)
Bản cũ đã có sẵn phần lớn phần MUST (catalog/variant, giỏ, checkout, đơn, admin, review, mã giảm giá, tài khoản, notification) và cả **khung provider thanh toán/vận chuyển**. → "Làm lại" thực chất là **cắt gọn phạm vi + đổi Stripe→COD/VNPay + thêm GHN/GHTK**, **giữ lại phần lõi đã chạy ổn** thay vì viết mới từ số 0. Điều này giúp khả thi trong 1 tháng.

## 4. Rủi ro & phụ thuộc (BA cảnh báo)
1. **VNPay có lead-time ngoài tầm kiểm soát**: cần **đăng ký hộ kinh doanh** + onboarding merchant (có thể vài tuần). → **Không nên chặn ra mắt**; ra mắt bằng **COD trước**, bật VNPay khi merchant sẵn sàng.
2. **1 tháng + VNPay + GHN/GHTK + accounts + review + discount** cùng lúc là **quá tải**. → Bám MUST ở §2; phần SHOULD làm cuốn chiếu.
3. **Review cần "đã mua"** để tránh review khống; **tài khoản** gây ma sát với khách social → ưu tiên **guest checkout**, tài khoản là tuỳ chọn.
4. **Chưa có con số cho tiêu chí thành công** (bao nhiêu đơn/doanh thu/ngưỡng "bán chạy") → cần chốt để kết luận kiểm chứng.

## 5. Bản phác 1 tháng (gợi ý)
- **Tuần 1**: cắt gọn hệ thống về MVP (catalog + ảnh + trang SP mobile/OG + giỏ + guest checkout + COD).
- **Tuần 2**: quản lý đơn Admin/Staff + nhập mã vận đơn tay + **báo cáo per-SKU** + rà **Journals/Careers** (soạn 3–5 bài viết mở màn, đăng tin tuyển dụng, chạy UAT — code đã sẵn sàng).
- **Tuần 3**: ra mắt mềm + đẩy traffic social; song song onboard VNPay + GHN/GHTK.
- **Tuần 4**: bật VNPay/GHN khi sẵn sàng; thêm review + mã giảm giá; đo & kết luận.

## 6. Câu hỏi còn mở (vòng sau: Quy trình & Dữ liệu)
1. Chốt **con số** cho từng tiêu chí thành công (đơn/doanh thu/ngưỡng bán chạy).
2. Quy trình **xử lý đơn** thực tế (ai làm gì từ lúc đặt → giao) để thiết kế trạng thái đơn.
3. Thông tin **sản phẩm** cần quản lý (thuộc tính, biến thể, tồn kho, giá) → data dictionary.
4. Có cần **hoá đơn/thuế** gì khi bán ở VN không.
