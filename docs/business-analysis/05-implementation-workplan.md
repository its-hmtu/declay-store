# Declay Store — Kế hoạch Hoàn thiện Hệ thống (Implementation Work Plan)

**Companion to:** `01-requirements-brd-srs.md`, `02-diagrams.md`, `03-system-design.md`, `04-feature-backlog-roadmap-gap-analysis.md`
**Ngày lập:** 2026-07-07
**Mục tiêu:** Go-live bán thật (nhận tiền thật qua Stripe, tồn kho thật, hàng handmade)
**Đối tượng đọc:** Product owner, BA, Dev lead, QA

---

## Cách đọc tài liệu này

Đây là danh mục công việc (WBS) để đưa hệ thống từ trạng thái hiện tại lên **hoàn chỉnh cho vận hành bán thật**. Mỗi công việc được gắn: **Module**, **Phase**, **Priority**, **Estimate** (ước lượng ngày-người, mang tính chỉ báo — cần Dev chốt lại), **Phụ thuộc**, và **Definition of Done (DoD)**.

Ba phase:

- **P0 — Chặn go-live:** không xong thì không được nhận đồng tiền thật đầu tiên. Chủ yếu là lỗi tiền/kho/quyền và nghĩa vụ pháp lý tối thiểu.
- **P1 — Trước launch:** cần để trải nghiệm và vận hành không vỡ, nhưng có thể làm song song ngay sau khi P0 ổn định.
- **P2 — Sau launch / tăng trưởng:** hoàn thiện, tối ưu, mở rộng.

Bốn mức Priority: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.

Tất cả phát hiện dưới đây đã được **đối chiếu trực tiếp với code** (order.service, admin-user.route, shipping-queue, package.json, migrations, storefront pages), không chỉ dựa tài liệu.

---

## 1. Bảng tổng quan theo Phase

| Phase | Trọng tâm | Số hạng mục | Ước lượng thô |
|---|---|:--:|:--:|
| P0 — Chặn go-live | Tiền, kho, phân quyền, fulfillment thật, audit, pháp lý tối thiểu | 12 | ~22–30 ngày-người |
| P1 — Trước launch | UX khách, dữ liệu đơn hàng, notification, hạ tầng file, rate limit | 11 | ~20–28 ngày-người |
| P2 — Sau launch | Report/dashboard, tính năng dang dở, SEO, mở rộng thanh toán/vận chuyển | 10 | ~25–35 ngày-người |

> Ước lượng chưa gồm thời gian test/UAT (cộng ~30%) và tích hợp bên thứ ba (vận chuyển/thanh toán nội địa) vốn phụ thuộc nhà cung cấp.

---

## 2. Ma trận công việc (Task × Module × Phase × Priority × Estimate)

### PHASE 0 — Chặn go-live

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc |
|---|---|---|:--:|:--:|---|
| W-01 | Idempotency cho Stripe webhook: guard `order.status !== 'pending_payment'` đầu `markAsPaid`, khóa dòng trong transaction | Payments & Inventory | 🔴 | 1–2 | — |
| W-02 | Sàn chống oversell: update tồn có điều kiện `stock >= qty`; nếu 0 dòng ảnh hưởng → huỷ/refund tự động | Payments & Inventory | 🔴 | 2 | W-01 |
| W-03 | Giữ hàng (reservation) khi tạo đơn `pending_payment`; nhả lại khi hết hạn/huỷ | Payments & Inventory | 🟠 | 3 | W-02 |
| W-04 | Bảng `payments`/`refunds` tách khỏi `orders`; hỗ trợ nhiều lần thử trả & hoàn một phần | Data model | 🟠 | 2–3 | W-01 |
| W-05 | Thực thi `requireRole` trên **mọi** route ghi của admin theo Permission Matrix | AuthZ / Roles | 🔴 | 2–3 | — |
| W-06 | Gate AI assistant theo role; chặn editor gọi tool ghi; kiểm tra role trong `safeExecute` | AI Assistant | 🔴 | 2 | W-05 |
| W-07 | Đổi `create_discount`/`create_banner` sang `destructive:true` + bound bắt buộc (`expiresAt`, trần `maxUses`) | AI Assistant | 🔴 | 1 | W-06 |
| W-08 | Thay fulfillment tự động giả bằng luồng admin thao tác tay (`paid→processing→shipped→delivered`) + nhập mã vận đơn thật; tắt auto-advance sau `paid` | Fulfillment | 🔴 | 3–4 | — |
| W-09 | Bảng `audit_log`; ghi từ mọi hành động ghi của admin và mọi tool AI (actor, action, entity, before/after, source) | Audit & Security | 🔴 | 3 | W-05 |
| W-10 | Rate limiting (`express-rate-limit`) cho auth, `/api/chat`, `/api/admin/assistant` | Audit & Security | 🔴 | 1–2 | — |
| W-11 | Trang pháp lý tối thiểu: Điều khoản, Bảo mật, Chính sách đổi trả/hoàn tiền, Vận chuyển | Legal / Content | 🔴 | 2 | — |
| W-12 | Scope pending state của assistant theo `adminId` (chống lạm dụng `pendingId` rò rỉ) | AI Assistant | 🟡 | 0.5 | W-06 |

### PHASE 1 — Trước launch

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc |
|---|---|---|:--:|:--:|---|
| W-13 | FE trang `/auth/reset-password` + `/auth/verify-email` tiêu thụ `?token=` (backend đã xong) | Customer UX | 🟠 | 2 | — |
| W-14 | Lưu tổng tiền chốt trên `orders` (`subtotal`, `shipping_fee`, `total`) tại thời điểm đặt | Data model | 🟠 | 1–2 | W-04 |
| W-15 | Phí vận chuyển + phương thức/vùng giao: bảng + tính vào tổng đơn | Fulfillment | 🟠 | 3 | W-14 |
| W-16 | Bảng `notifications` + trung tâm thông báo in-app cho admin (đơn mới, cần đóng gói) và khách | Notification | 🟠 | 3 | — |
| W-17 | Cảnh báo tồn kho thấp (ngưỡng cấu hình) cho admin | Notification | 🟠 | 1–2 | W-16 |
| W-18 | Chuyển upload từ đĩa local sang object storage/CDN (S3/Cloudinary) | Infra | 🟠 | 2–3 | — |
| W-19 | Endpoint upload CV công khai cho ứng viên (hiện chỉ nhận URL, route upload đang admin-only) | Careers | 🟡 | 1–2 | W-18 |
| W-20 | Enforce logic verified-purchase khi tạo review; chặn review khống | Reviews | 🟡 | 1 | — |
| W-21 | Business rule đơn: không lùi trạng thái; không xoá cứng sản phẩm đã có trong đơn (soft-delete) | Payments & Inventory | 🟡 | 1–2 | — |
| W-22 | Health check + log tập trung (structured logging) + cảnh báo lỗi cơ bản | Infra / Observability | 🟡 | 2 | — |
| W-23 | Hoàn thiện module `tags` (service/route/FE) — hiện chỉ có entity | Catalog | 🟢 | 2 | — |

### PHASE 2 — Sau launch / tăng trưởng

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc |
|---|---|---|:--:|:--:|---|
| W-24 | Dashboard/report admin: doanh thu, đơn theo trạng thái, bán chạy, tồn thấp, dùng mã | Reporting | 🟠 | 4–5 | W-09,W-14 |
| W-25 | Tích hợp đơn vị vận chuyển thật (GHN/GHTK/VNPost): tạo vận đơn, đồng bộ trạng thái | Fulfillment | 🟠 | 5–8 | W-08,W-15 |
| W-26 | Thêm cổng thanh toán nội địa (VNPay/Momo) song song Stripe | Payments | 🟠 | 5–8 | W-04 |
| W-27 | Quy trình đổi/trả (RMA) có trạng thái, không chỉ refund Stripe | Order Mgmt | 🟡 | 3–4 | W-04 |
| W-28 | SEO: sitemap, OG tags, structured data cho sản phẩm/bài viết | Storefront / SEO | 🟡 | 2–3 | — |
| W-29 | Hoá đơn điện tử / nghĩa vụ thuế (nếu áp dụng ở VN) | Compliance | 🟡 | TBD | — |
| W-30 | Kênh thông báo VN (Zalo/SMS OTP) nếu cần | Notification | 🟢 | 3 | W-16 |
| W-31 | Made-to-order (hàng làm theo yêu cầu, không giữ tồn) nếu mô hình cần | Catalog / Inventory | 🟢 | 3–4 | — |
| W-32 | Kiểm thử tự động (unit/integration) cho luồng tiền & kho | QA | 🟠 | 4 | W-01..W-04 |
| W-33 | Audit trail UI: màn hình tra cứu `audit_log` cho super_admin | Audit & Security | 🟢 | 2 | W-09 |

---

## 3. Chi tiết & Definition of Done cho các hạng mục Critical (P0)

**W-01 — Idempotency webhook.** DoD: gửi lặp `payment_intent.succeeded` cùng một PaymentIntent chỉ trừ kho một lần, đếm mã một lần, gửi email một lần, đẩy fulfillment một lần; có test tái hiện webhook lặp; log ghi nhận lần lặp bị bỏ qua.

**W-02 — Chống oversell.** DoD: hai giao dịch đồng thời mua món tồn = 1 chỉ một giao dịch thành công; giao dịch còn lại được huỷ và hoàn tiền tự động; không bao giờ có `stock < 0`; có test đồng thời.

**W-05 — Thực thi phân quyền.** DoD: mọi route ghi của admin từ chối role không đủ quyền (HTTP 403) đúng theo Permission Matrix trong `04`; editor không xoá/sửa được sản phẩm, đơn, mã giảm giá; có bảng test theo từng route × role.

**W-06/W-07 — Siết AI assistant.** DoD: editor không thực thi được tool ghi qua ngôn ngữ tự nhiên; `create_discount`/`create_banner` yêu cầu bước xác nhận; không tạo được mã giảm giá không có hạn dùng/không có hạn số lần; ghi audit mọi tool ghi.

**W-08 — Fulfillment thật.** DoD: sau khi `paid`, hệ thống KHÔNG tự chuyển trạng thái; admin bấm chuyển `processing/shipped/delivered`; email "đã ship" chỉ gửi khi admin nhập mã vận đơn thật; không còn carrier/tracking bịa ra. (Cần product owner chốt hướng: thao tác tay ngay bây giờ, tích hợp carrier thật ở W-25 sau.)

**W-09 — Audit log.** DoD: mọi thay đổi giá/trạng thái đơn/mã giảm giá/xoá sản phẩm + mọi tool AI đều tạo bản ghi truy vấn được (ai, làm gì, khi nào, trước/sau, nguồn: admin UI hay AI); giữ tối thiểu 1 năm.

**W-10 — Rate limiting.** DoD: login giới hạn số lần/IP; `/api/chat` và `/api/admin/assistant` giới hạn per-session/per-admin; vượt ngưỡng trả 429; có cấu hình ngưỡng.

**W-11 — Trang pháp lý.** DoD: 4 trang pháp lý xuất bản, link ở footer và trong luồng checkout; nội dung do chủ shop duyệt.

---

## 4. Đề xuất trình tự thực thi (Sprint plan gợi ý, 2 tuần/sprint)

**Sprint 1 (ổn định tiền & quyền):** W-01, W-02, W-05, W-10 → đóng ngay các lỗ hổng tiền/kho/quyền/lạm dụng API. Đây là nhóm rủi ro tài chính trực tiếp, làm trước tiên.

**Sprint 2 (fulfillment thật & trách nhiệm):** W-08, W-09, W-06, W-07, W-11, W-12 → dừng gửi email giao hàng giả, có audit, siết AI, đủ pháp lý tối thiểu. Kết thúc Sprint 2 là **đủ điều kiện go-live thận trọng**.

**Sprint 3 (trải nghiệm & dữ liệu):** W-13, W-14, W-04, W-16, W-17, W-18 → khách reset/verify được, đơn hàng lưu tổng chốt, có thông báo, file lên CDN.

**Sprint 4 (hoàn thiện & vận hành):** W-15, W-19, W-20, W-21, W-22, W-32 → phí ship, CV upload, review sạch, rule đơn, quan trắc, test tự động luồng tiền.

**Sau đó (P2):** W-24 → W-33 theo nhu cầu kinh doanh.

---

## 5. Câu hỏi mở đang chặn phạm vi (cần product owner chốt)

1. **Fulfillment:** chọn (a) admin thao tác tay ngay, hay (b) tích hợp carrier thật (GHN/GHTK/VNPost) ngay từ launch? Ảnh hưởng W-08 vs W-25.
2. **Thanh toán:** chỉ Stripe hay cần VNPay/Momo nội địa ngay? Ảnh hưởng W-26 lên/xuống phase.
3. **Kho:** một kho tập trung, hay có cả made-to-order không giữ tồn? Ảnh hưởng W-03, W-31.
4. **Pháp lý:** có nghĩa vụ hoá đơn điện tử/thuế khi bán ở VN? Ảnh hưởng W-29.

---

## 6. Definition of Done toàn cục (áp cho mọi hạng mục)

Một hạng mục chỉ "xong" khi: có code + test (đơn vị hoặc tích hợp cho luồng quan trọng), qua review, cập nhật tài liệu liên quan (BRD/SRS/data dictionary nếu đổi schema), có UAT scenario được QA xác nhận, và không để lại cờ tạm/dữ liệu giả trong môi trường production.
