# Declay Store — UAT Test Cases (Toàn hệ thống)

**Ngày:** 2026-07-08 · **Phiên bản:** 1.0
**Phạm vi:** Storefront, Admin panel, Chatbot khách, AI Assistant admin, và 8 hạng mục hardening P0 (W-01…W-10).
**Companion:** `05-implementation-workplan.md`

---

## Cách dùng

Mỗi test case có: **ID**, **Kịch bản**, **Điều kiện trước**, **Bước chính**, **Kết quả mong đợi**, **Loại** (P=positive, N=negative, E=edge), **Ưu tiên** (Cao/TB/Thấp). Tester ghi kết quả (Pass/Fail) + ghi chú ở cột trống khi chạy.

**Môi trường:** API `web-api` (Express) + FE `web-fe` (Next.js) + PostgreSQL + Redis + Stripe (test mode). Trước khi test hardening: đã chạy `node scripts/migrate.js` (có bảng `audit_log`), có ít nhất 3 tài khoản admin theo 3 role (`super_admin`, `admin`, `editor`), và Stripe CLI để giả webhook.

**Legend trạng thái đơn:** `pending_payment → paid → processing → shipped → delivered`; nhánh phụ: `cancelled`.

---

## 1. Xác thực & Tài khoản (AUTH)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-AUTH-01 | Đăng ký thành công | Email chưa tồn tại | Nhập email/mật khẩu hợp lệ, submit | Tài khoản tạo, gửi email xác thực, trạng thái chưa verify | P | Cao |
| TC-AUTH-02 | Đăng ký email trùng | Email đã tồn tại | Đăng ký lại cùng email | Báo lỗi email đã dùng, không tạo trùng | N | Cao |
| TC-AUTH-03 | Đăng ký mật khẩu yếu | — | Nhập mật khẩu không đạt schema | Bị chặn bởi validation, thông báo rõ | N | TB |
| TC-AUTH-04 | Đăng nhập đúng | Đã có tài khoản | Nhập đúng email/mật khẩu | Trả access + refresh token, vào được | P | Cao |
| TC-AUTH-05 | Đăng nhập sai mật khẩu | — | Nhập sai mật khẩu | Từ chối, không lộ thông tin tài khoản | N | Cao |
| TC-AUTH-06 | Google OAuth | Có Google account | Đăng nhập bằng Google | Tạo/nối tài khoản, đăng nhập thành công | P | TB |
| TC-AUTH-07 | Refresh token | Có refresh token hợp lệ | Gọi refresh | Cấp access token mới | P | TB |
| TC-AUTH-08 | Logout thu hồi token | Đang đăng nhập | Logout rồi dùng lại token cũ | Token cũ bị từ chối (denylist) | P | Cao |
| TC-AUTH-09 | Quên mật khẩu (BE) | Tài khoản tồn tại | Gọi forgot-password | Gửi email chứa link token | P | Cao |
| TC-AUTH-10 | Đặt lại mật khẩu | Có token reset hợp lệ | Gọi reset-password với token | Đổi mật khẩu, token dùng-một-lần bị vô hiệu | P | Cao |
| TC-AUTH-11 | Reset token hết hạn/đã dùng | Token cũ | Dùng lại token | Bị từ chối | N | Cao |
| TC-AUTH-12 | Xác thực email | Có token verify | Gọi verify-email | Đánh dấu email verified | P | TB |
| TC-AUTH-13 | FE trang reset/verify (W-13, chưa làm) | — | Bấm link trong email | *Ghi nhận:* hiện chưa có trang FE tiêu thụ token — kỳ vọng sau W-13 | E | Cao |

## 2. Danh mục & Sản phẩm (CATALOG)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-CAT-01 | Duyệt danh mục phân cấp | Có danh mục cha/con | Mở trang danh mục | Hiển thị đúng cây phân cấp | P | TB |
| TC-CAT-02 | Danh sách sản phẩm + phân trang | Có >1 trang sản phẩm | Chuyển trang | Phân trang đúng, không trùng/lặp | P | TB |
| TC-CAT-03 | Tìm kiếm sản phẩm | — | Nhập từ khoá | Trả kết quả khớp, rỗng khi không khớp | P/E | TB |
| TC-CAT-04 | Chi tiết sản phẩm + biến thể | Sản phẩm có nhiều biến thể | Mở chi tiết | Hiển thị giá/tồn theo biến thể, ảnh | P | Cao |
| TC-CAT-05 | Sản phẩm hết hàng | Biến thể stock=0 | Mở chi tiết | Hiển thị hết hàng, chặn thêm giỏ | E | Cao |
| TC-CAT-06 | Cache chi tiết sản phẩm | — | Mở lại nhiều lần | Trả nhanh, dữ liệu nhất quán sau cập nhật | E | Thấp |

## 3. Giỏ hàng & Wishlist (CART/WISH)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-CART-01 | Thêm biến thể vào giỏ | Đăng nhập | Thêm sản phẩm | Giỏ cập nhật số lượng/giá đúng | P | Cao |
| TC-CART-02 | Cập nhật số lượng | Có item trong giỏ | Tăng/giảm | Tổng tính lại đúng | P | TB |
| TC-CART-03 | Vượt tồn kho | qty > stock | Tăng vượt tồn | Chặn, báo tồn khả dụng | N | Cao |
| TC-CART-04 | Xoá item | Có item | Xoá | Item biến mất, tổng cập nhật | P | TB |
| TC-WISH-01 | Thêm/xoá wishlist | Đăng nhập | Bấm nút wishlist | Trạng thái đồng bộ, trang wishlist đúng | P | Thấp |

## 4. Checkout & Thanh toán + Tiền/Kho (PAY) — bao gồm W-01/W-02/W-03

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-PAY-01 | Checkout tạo đơn + PaymentIntent | Giỏ có hàng | Bắt đầu checkout | Tạo đơn `pending_payment`, trả clientSecret; **tồn kho bị trừ ngay (reservation, W-03)** | P | Cao |
| TC-PAY-02 | Thanh toán thành công | Có clientSecret | Trả tiền (thẻ test) → webhook `payment_intent.succeeded` | Đơn chuyển `paid`, gửi 1 email "paid", xoá giỏ, đếm mã giảm giá (nếu có) | P | Cao |
| TC-PAY-03 | **Idempotency webhook (W-01)** | Đơn vừa paid | Gửi lặp lại webhook cùng PaymentIntent (Stripe resend) | **Không** trừ kho lần 2, **không** email lần 2, **không** đếm mã lần 2 | N | Cao |
| TC-PAY-04 | **Chống oversell đồng thời (W-02/W-03)** | 1 biến thể `stock=1` | Hai phiên checkout gần như đồng thời | Chỉ **một** đơn tạo thành công; đơn kia nhận lỗi 409 hết hàng | E | Cao |
| TC-PAY-05 | **Reservation hết hạn (W-03)** | Đơn `pending_payment`, không trả tiền | Chờ quá `RESERVATION_TTL_MS` | Đơn tự chuyển `cancelled`, **tồn kho được hoàn lại** | E | Cao |
| TC-PAY-06 | Reservation nhả khi huỷ | Đơn `pending_payment` | Khách huỷ đơn | Tồn kho hoàn lại, trạng thái `cancelled` | P | Cao |
| TC-PAY-07 | Oversell tại thời điểm trả tiền | (Hiếm) tồn về 0 giữa chừng | Webhook paid khi không đủ tồn | Rollback, tự refund + huỷ đơn (không giữ tiền) | E | Cao |
| TC-PAY-08 | Chữ ký webhook sai | — | Gửi webhook chữ ký sai | Bị từ chối (verify signature) | N | Cao |
| TC-PAY-09 | Thanh toán thất bại | Thẻ test bị từ chối | Trả tiền lỗi | Đơn ở `pending_payment`, không giao hàng | N | Cao |

## 5. Đơn hàng khách (ORDER)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-ORD-01 | Lịch sử đơn | Có đơn | Mở trang đơn | Liệt kê đúng, phân trang | P | TB |
| TC-ORD-02 | Chi tiết đơn | Có đơn | Mở chi tiết | Hiển thị item snapshot (giá/tên tại thời điểm mua) | P | TB |
| TC-ORD-03 | Huỷ đơn chưa trả | Đơn `pending_payment` | Huỷ | `cancelled`, hoàn tồn, không refund (chưa trả) | P | Cao |
| TC-ORD-04 | Huỷ + refund đơn đã trả | Đơn `paid` | Huỷ | Hoàn tồn + refund Stripe, `cancelled` | P | Cao |
| TC-ORD-05 | Huỷ đơn không thuộc mình | Đơn user khác | Gọi huỷ | Bị từ chối (404/403) | N | Cao |
| TC-ORD-06 | Huỷ đơn đã shipped | Đơn `shipped` | Huỷ | Bị chặn (400) | N | TB |
| TC-ORD-07 | Xem vận đơn (shipment) | Đơn đã shipped | Mở "my shipment" | Hiển thị carrier + tracking thật | P | TB |

## 6. Review, Blog, Tuyển dụng (CONTENT)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-REV-01 | Viết review khi đã mua | Đã mua sản phẩm | Gửi review | Tạo review, đánh dấu verified purchase | P | TB |
| TC-REV-02 | Review khi chưa mua | Chưa mua | Gửi review | *Kỳ vọng W-20:* chặn hoặc không đánh verified | N | TB |
| TC-BLOG-01 | Xem bài viết published | Có bài published | Mở blog | Hiển thị nội dung, tăng views | P | Thấp |
| TC-BLOG-02 | Bài chưa published | Bài draft | Truy cập trực tiếp | Không hiển thị công khai | N | TB |
| TC-JOB-01 | Xem tin tuyển dụng | Có job mở | Mở careers | Hiển thị danh sách job đang mở | P | Thấp |
| TC-JOB-02 | Nộp hồ sơ (CV theo URL) | Job đang mở | Nộp với cv_url | Tạo application; *ghi nhận:* chưa upload file (W-19) | P/E | TB |

## 7. Mã giảm giá tại checkout (DISC)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-DISC-01 | Áp mã percent hợp lệ | Mã còn hiệu lực | Nhập mã | Giảm đúng %, tổng cập nhật | P | Cao |
| TC-DISC-02 | Áp mã fixed | Mã fixed | Nhập mã | Trừ đúng số tiền | P | TB |
| TC-DISC-03 | Mã hết hạn | `expiresAt` quá khứ | Nhập mã | Bị từ chối | N | Cao |
| TC-DISC-04 | Mã vượt `maxUses` | Đã dùng hết lượt | Nhập mã | Bị từ chối | N | Cao |
| TC-DISC-05 | Chưa đạt `minOrderAmount` | Tổng < min | Nhập mã | Báo lỗi tối thiểu đơn | N | TB |
| TC-DISC-06 | Đếm lượt dùng đúng lúc paid | Đơn dùng mã | Thanh toán thành công | `usedCount` +1 (một lần, kể cả webhook lặp) | E | Cao |

## 8. Chatbot khách (CHAT) — gồm W-10

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-CHAT-01 | Hỏi đáp cơ bản | — | Gửi câu hỏi | Trả lời streaming (SSE), không có hành động ghi | P | TB |
| TC-CHAT-02 | Tra cứu đơn khi đã đăng nhập | Đăng nhập | Hỏi về đơn của mình | Trả thông tin đơn hợp lệ (read-only) | P | TB |
| TC-CHAT-03 | **Rate limit chat (W-10)** | — | Gửi > `RATE_LIMIT_CHAT_MAX`/phút | Trả 429 khi vượt ngưỡng | N | Cao |

## 9. Admin — Xác thực & Phân quyền (ADMIN-AUTH) — W-05, W-06

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-ADM-01 | Đăng nhập admin | Có tài khoản admin | Login | Trả admin token (secret riêng) | P | Cao |
| TC-ADM-02 | **editor bị chặn xoá sản phẩm (W-05)** | Đăng nhập editor | DELETE `/admin/products/:id` | **403** Insufficient permissions | N | Cao |
| TC-ADM-03 | **editor bị chặn đổi trạng thái đơn (W-05)** | editor | PUT `/admin/orders/:id/status` | **403** | N | Cao |
| TC-ADM-04 | **editor bị chặn tạo mã giảm giá (W-05)** | editor | POST `/admin/discounts` | **403** | N | Cao |
| TC-ADM-05 | editor được sửa nội dung | editor | Tạo/sửa bài viết, danh mục, banner | Cho phép (200) | P | Cao |
| TC-ADM-06 | admin làm được hành động tài chính | admin | Xoá sản phẩm, đổi trạng thái đơn, tạo mã | Cho phép (200) | P | Cao |
| TC-ADM-07 | quản lý user admin chỉ super_admin | admin (không phải super) | Gọi `/admin/users` | **403**; super_admin thì OK | N | Cao |
| TC-ADM-08 | **editor bị chặn AI assistant (W-06)** | editor | POST `/admin/assistant` | **403** | N | Cao |
| TC-ADM-09 | admin dùng được assistant | admin | POST `/admin/assistant` | Cho phép | P | Cao |
| TC-ADM-10 | Token admin bị thu hồi | Đã logout/thu hồi | Dùng lại token | 401 | N | Cao |

## 10. Admin — Catalog & Nội dung (ADMIN-CRUD)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-ACRUD-01 | Tạo/sửa/xoá sản phẩm | admin | CRUD sản phẩm | Thay đổi lưu đúng | P | Cao |
| TC-ACRUD-02 | Quản lý biến thể (giá/tồn) | admin | CRUD biến thể | Giá/tồn cập nhật đúng | P | Cao |
| TC-ACRUD-03 | Upload ảnh | admin/editor | Upload ảnh sản phẩm | Ảnh lưu, trả URL; *ghi nhận:* đĩa local (W-18) | P/E | TB |
| TC-ACRUD-04 | Tạo danh mục phân cấp | admin/editor | Tạo con dưới cha | Cây danh mục đúng | P | TB |
| TC-ACRUD-05 | Banner CRUD | admin/editor | Tạo/sửa/xoá banner | Storefront hiển thị đúng, cache cập nhật | P | Thấp |
| TC-ACRUD-06 | Cài đặt site | admin | Sửa settings | Lưu đúng; editor bị 403 | P/N | TB |

## 11. Admin — Đơn hàng & Fulfillment (ADMIN-FUL) — W-08

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-FUL-01 | **Đơn paid KHÔNG tự chuyển (W-08)** | Đơn vừa paid | Chờ, không thao tác | Đơn đứng ở `paid`, **không** email "shipped" tự động | P | Cao |
| TC-FUL-02 | Admin chuyển processing | Đơn `paid` | PUT status=`processing` | `processing`, gửi email cập nhật | P | Cao |
| TC-FUL-03 | **Đánh shipped kèm tracking thật (W-08)** | Đơn `paid`/`processing` | POST `/admin/orders/:id/shipment` với carrier+tracking | Tạo shipment, `shipped`, email có tracking thật | P | Cao |
| TC-FUL-04 | **Chặn set shipped trốn tracking (W-08)** | Đơn `paid` | PUT status=`shipped` | **400** — buộc dùng endpoint shipment | N | Cao |
| TC-FUL-05 | Đánh delivered | Đơn `shipped` | PUT shipment `deliveredAt` | `delivered`, email giao hàng | P | TB |
| TC-FUL-06 | Ship đơn chưa paid | Đơn `pending_payment` | Tạo shipment | Bị chặn (400) | N | Cao |
| TC-FUL-07 | Shipment trùng | Đơn đã có shipment | Tạo shipment lần 2 | 409 | N | TB |

## 12. AI Assistant admin (ASSIST) — W-06, W-07

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-AI-01 | Truy vấn read (search/list) | admin | Hỏi tồn/đơn | Dùng tool đọc, trả dữ liệu thật, không bịa | P | TB |
| TC-AI-02 | Hành động destructive cần xác nhận | admin | Yêu cầu xoá sản phẩm / đổi trạng thái đơn | Dừng chờ xác nhận (SSE `confirm`), chỉ chạy sau approve | P | Cao |
| TC-AI-03 | **create_discount cần xác nhận (W-07)** | admin | Yêu cầu tạo mã giảm giá | Được phân loại destructive → chờ xác nhận | P | Cao |
| TC-AI-04 | **Bắt buộc maxUses + expiresAt (W-07)** | admin | Tạo mã thiếu maxUses/expiresAt | Bị chặn, yêu cầu bổ sung | N | Cao |
| TC-AI-05 | **Chặn value≤0 / percent>100 (W-07)** | admin | Tạo mã percent=150 | Bị chặn | N | Cao |
| TC-AI-06 | create_banner cần xác nhận (W-07) | admin | Tạo banner | Chờ xác nhận | P | TB |
| TC-AI-07 | Giới hạn vòng lặp tool | — | Yêu cầu chuỗi dài | Dừng ở `MAX_TOOL_ROUNDS`, không loop vô hạn | E | TB |
| TC-AI-08 | **Rate limit assistant (W-10)** | admin | Gửi > `RATE_LIMIT_ASSISTANT_MAX`/phút | 429 | N | Cao |
| TC-AI-09 | Xác nhận sai pendingId | admin | Confirm với id không hợp lệ/hết hạn | Bị từ chối an toàn | N | TB |

## 13. Audit Log (AUDIT) — W-09

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-AUD-01 | Ghi admin write | Đã migrate 006 | admin xoá/sửa sản phẩm | `audit_log` có bản ghi: actor admin, action, body đã lọc mật khẩu | P | Cao |
| TC-AUD-02 | Ghi tool AI | — | assistant chạy 1 tool | Bản ghi `actor_type='ai_assistant'`, có input, status success | P | Cao |
| TC-AUD-03 | Ghi tool AI lỗi | — | tool ném lỗi (vd mã percent>100) | Bản ghi status `error` + message | P | TB |
| TC-AUD-04 | Không chặn hành động chính | Giả lỗi ghi audit | Thực hiện write | Hành động chính vẫn thành công (fire-and-forget) | E | Cao |
| TC-AUD-05 | Lọc dữ liệu nhạy cảm | body có password/token | admin write | Trường nhạy cảm bị `[redacted]` | P | Cao |

## 14. Phi chức năng (NFR)

| ID | Kịch bản | Điều kiện | Bước chính | Kết quả mong đợi | Loại | Ưu tiên |
|---|---|---|---|---|---|---|
| TC-NFR-01 | **Rate limit auth (W-10)** | — | > `RATE_LIMIT_AUTH_MAX` lần login/15 phút | 429 | N | Cao |
| TC-NFR-02 | Trust proxy IP | Sau reverse proxy, `TRUST_PROXY=true` | Nhiều IP khác nhau | Rate limit tính đúng theo IP thật | E | Cao |
| TC-NFR-03 | Helmet headers | — | Kiểm tra response headers | Có security headers | P | TB |
| TC-NFR-04 | Truy cập không token | — | Gọi endpoint admin không token | 401 | N | Cao |
| TC-NFR-05 | Chịu tải cơ bản checkout | — | Nhiều checkout đồng thời | Không oversell, không lỗi 5xx hàng loạt | E | TB |

---

## Ma trận truy vết Hardening → Test case

| Hạng mục | Test case chính |
|---|---|
| W-01 Idempotency webhook | TC-PAY-03, TC-DISC-06 |
| W-02 Chống oversell | TC-PAY-04, TC-PAY-07 |
| W-03 Reservation + hết hạn | TC-PAY-01, TC-PAY-05, TC-PAY-06 |
| W-05 Phân quyền admin | TC-ADM-02..07 |
| W-06 Gate AI assistant | TC-ADM-08, TC-ADM-09 |
| W-07 AI discount/banner bounds | TC-AI-03, TC-AI-04, TC-AI-05, TC-AI-06 |
| W-08 Fulfillment thật | TC-FUL-01, TC-FUL-03, TC-FUL-04 |
| W-09 Audit log | TC-AUD-01..05 |
| W-10 Rate limiting | TC-CHAT-03, TC-AI-08, TC-NFR-01 |

## Ghi chú các mục chưa làm (tham chiếu để không nhầm là lỗi)

Trang FE reset/verify (W-13), upload object storage & CV (W-18/W-19), verified-purchase review (W-20), bảng payments/refunds (W-04), trang pháp lý (W-11), dashboard/report (W-24) — các test case liên quan (TC-AUTH-13, TC-JOB-02, TC-REV-02, TC-ACRUD-03) hiện chỉ để **ghi nhận trạng thái**, không tính là fail.
