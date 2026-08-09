# Declay Store — Kế hoạch Hoàn thiện Hệ thống (Implementation Work Plan)

**Companion to:** `01-requirements-brd-srs.md`, `02-diagrams.md`, `03-system-design.md`, `04-feature-backlog-roadmap-gap-analysis.md`
**Ngày lập:** 2026-07-07
**Mục tiêu:** Go-live bán thật (nhận tiền thật qua Stripe, tồn kho thật, hàng handmade)
**Đối tượng đọc:** Product owner, BA, Dev lead, QA
**Cập nhật:** 2026-07-16 — ✅ Toàn bộ **P0 (W-01→W-12)** và **P1 (W-13→W-23)** đã hoàn thành. Bổ sung ngoài kế hoạch gốc: module giá (special price / campaign / collections) và nâng cấp UX storefront + design system (xem **mục 2b**). Còn lại: **P2 (W-24→W-33)** theo nhu cầu kinh doanh.

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

> **Bổ sung phạm vi 2026-08-05 — Journals & Careers vào MVP.** Hai nhóm tính năng này **đã build xong** (W-18, W-19 đóng; module `article`, `job`, `job-application`, `upload`), nên **không phát sinh hạng mục kỹ thuật mới**. Việc còn lại trước launch là **nội dung + kiểm thử**:
>
> | ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
> |---|---|---|:--:|:--:|---|:--:|
> | W-34 | Soạn & publish 3–5 bài Journals mở màn (câu chuyện thương hiệu, quy trình làm handmade, hướng dẫn bảo quản) | Content | 🟠 | 2–3 | — | ⬜ |
> | W-35 | Đăng tin tuyển dụng thật + kiểm tra luồng ứng tuyển đầu-cuối (upload CV → pipeline admin) | Careers | 🟠 | 0.5–1 | W-19 | ⬜ |
> | W-36 | Chạy UAT nhóm CONTENT (TC-BLOG-01..05, TC-JOB-01..09 ở `06-uat-test-cases.md`) | QA | 🟠 | 1 | W-34, W-35 | ⬜ |
> | W-37 | Chốt: có mở quyền Careers cho Staff/Editor không (hiện `requireRole('admin','super_admin')`) | Phân quyền | 🟡 | 0.5 | — | ⬜ |
> | W-38 | Chính sách lưu trữ/xoá PII ứng viên (CV, email) — bổ sung vào trang Bảo mật | Compliance | 🟡 | 0.5–1 | — | ⬜ |
> | W-39 | Guard chuyển trạng thái ứng viên (chặn lùi/nhảy bậc; `hired`/`rejected` là kết thúc) — hiện `updateStatus` chỉ validate enum | Careers | 🟢 | 0.5 | — | ⬜ |

### 2c. Pricing & Campaign — đợt sửa 2026-08-05  ✅ (4/6 hoàn thành)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-40 | Gộp quy tắc giá về một nguồn: server trả `effectivePrice`/`discountPercent`/`source`; FE chỉ hiển thị (gỡ 4 bản sao) | Pricing | 🔴 | 1–2 | — | ✅ |
| W-41 | Gắn campaign vào `order_items` (migration 032) + báo cáo `campaign-performance` + tách `organicUnits` khỏi Top SKU | Reporting | 🔴 | 2 | W-40 | ✅ |
| W-42 | Cảnh báo margin khi tạo/sửa campaign (`preview-impact`) + log đơn bán dưới giá vốn. **Cảnh báo, không chặn khách.** | Pricing | 🟠 | 1–2 | W-40 | ✅ |
| W-43 | Invalidate cache sản phẩm khi sửa campaign; cache + invalidate cho collections; `productCount` chỉ đếm SP hiển thị được; bật lại link `/collections` | Infra / Merch | 🟠 | 0.5 | — | ✅ |
| W-44 | **Campaign hiện diện với khách**: trang/section chiến dịch, đếm ngược `endsAt`, badge phân biệt "Sale" (special price) vs "Campaign" — `source` đã có sẵn trong payload | Storefront | 🟠 | 2–3 | W-40 | ⬜ |
| W-45 | Dựng test framework cho frontend (Vitest + Testing Library) — hiện BE có 40+ file test, FE có 0 | QA | 🟠 | 1–2 | — | ⬜ |

### 2d. Chat & AI vào MVP — đợt 2026-08-06  ✅ (6/9 hoàn thành)

Chatbot khách và AI Assistant admin **đã có sẵn** (module `chat`, `assistant`); phần mới là **chat real-time khách ↔ nhân viên**.

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-46 | Migration 033: `chat_sessions.mode` + handoff fields; `chat_messages` thêm role `staff`/`system`, `admin_id`, `author_name` | Chat | 🔴 | 0.5 | — | ✅ |
| W-47 | `lib/chat-bus.ts`: Redis pub/sub theo session + kênh inbox + presence (heartbeat 30s / TTL 60s) | Infra | 🔴 | 1 | W-46 | ✅ |
| W-48 | State machine `chat.handoff.ts` (bot→waiting→live→closed) + quy tắc ai được nói — **thuần, có 21 unit test** | Chat | 🔴 | 0.5 | — | ✅ |
| W-49 | `live-chat.service/controller/route`: handoff, claim, gửi tin, đóng, inbox, SSE hai phía | Chat | 🔴 | 2 | W-47, W-48 | ✅ |
| W-50 | FE: ChatWidget thêm "Talk to a person" + luồng live; trang `/admin/inbox` cho nhân viên | Chat / FE | 🔴 | 2 | W-49 | ✅ |
| W-51 | Email ngoài giờ: báo staff kèm transcript, xác nhận cho khách | Notification | 🟠 | 0.5 | W-49 | ✅ |
| W-52 | **Render free plan tự ngủ khi hết traffic** → SSE đứt, khách thấy "Connection lost". Cần nâng plan hoặc thêm auto-reconnect có backoff ở FE | Infra | 🔴 | 0.5–1 | — | ⬜ |
| W-53 | Giới hạn/theo dõi chi phí Claude API (đã có rate-limit; chưa có ngân sách/cảnh báo) | Infra / Cost | 🟠 | 1 | — | ⬜ |
| W-54 | Audit log cho thao tác ghi của AI Assistant (hiện chỉ nằm trong `chat_messages.tool_calls`) | Audit | 🟠 | 1–2 | — | ⬜ |
| W-55 | Nút gợi ý sẵn cho chatbot (`lib/chat-chips.ts`) + i18n VN/EN; tách **điều hướng** vs **hỏi bot** | Chat / FE | 🟠 | 0.5 | — | ✅ |
| W-56 | Tool `get_policy` đọc bảng `pages` — bỏ chính sách hardcode trong system prompt | Chat | 🟠 | 0.5 | — | ✅ |
| W-57 | **Cần page `policies` và `terms` đã publish trong CMS** — nếu chưa có, `get_policy` trả 404 và bot rơi về text dự phòng | Content | 🟠 | 0.5 | W-56 | ⬜ |
| W-58 | Bổ sung filter "đang giảm giá" trên `/products` để có nút chip tương ứng (phụ thuộc W-44) | Storefront | 🟢 | 1 | W-44 | ⬜ |

### 2e. Campaigns & Collections — đợt 2026-08-06  ✅ (5/6 hoàn thành)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-44 | **Campaign hiện diện với khách** — thay cho "trang campaign": campaign là **filter** `/products?campaignId=N`. Thêm announcement bar, badge có tên chiến dịch, ribbon + đếm ngược ở trang SP | Storefront | 🟠 | 2 | W-40 | ✅ |
| W-59 | Backend: param `campaignId` cho danh sách SP + `getActiveProductIds` (chỉ trả SP khi campaign đang chạy) | Catalog | 🟠 | 0.5 | — | ✅ |
| W-60 | Migration 034: `banners.campaign_id` — banner **tự ẩn** khi campaign kết thúc, link tự sinh `/products?campaignId=N` | Merch | 🟠 | 0.5 | W-59 | ✅ |
| W-61 | **Trang Collection dùng lại nguyên layout Shop** (sidebar + sort + infinite scroll), chỉ đổi tiêu đề thành tên collection. `ProductFilters`/`ProductSort` nhận `basePath` | Storefront | 🟠 | 1 | — | ✅ |
| W-62 | `campaign-display.ts`: countdown, chọn campaign headline, badge theo `source` — **21 unit test** | Storefront | 🟠 | 0.5 | — | ✅ |
| W-63 | Admin UI: chọn campaign khi tạo/sửa banner (hiện đã có cột + API, form chưa có ô chọn) | Merch / FE | 🟠 | 0.5 | W-60 | ⬜ |
| W-64 | Migration 035: `collections.image_url` + ô upload ảnh bìa trong admin | Merch | 🟠 | 0.5 | — | ✅ |
| W-65 | `GET /api/collections?withProducts=N` — trả kèm sản phẩm để render carousel, **tự loại collection rỗng** | Catalog | 🟠 | 0.5 | W-64 | ✅ |
| W-66 | `CollectionCarousel`: ảnh bìa + tên + hàng sản phẩm cuộn ngang. Dùng chung cho trang chủ và `/collections` | Storefront | 🟠 | 1 | W-65 | ✅ |
| W-67 | Trang chủ hiện 3 collection đầu; `/collections` hiện tất cả dạng carousel (trước đây chỉ là thẻ chữ) | Storefront | 🟠 | 0.5 | W-66 | ✅ |
| W-68 | Header: **bỏ** mục Collections khỏi nav; thêm "Tất cả bộ sưu tập" vào cột By Collection (desktop + mobile) | Storefront | 🟠 | 0.5 | — | ✅ |
| W-69 | OG image cho trang collection (dùng ảnh bìa) — link chia sẻ lên social trước đây ra thẻ trắng | SEO | 🟡 | 0.25 | W-64 | ✅ |
| W-71 | Migration 036: `categories.show_on_home` + toggle trong admin; API `?homeOnly=1` | Merch | 🟠 | 0.5 | — | ✅ |
| W-72 | Tách `ProductRow` dùng chung; `CollectionCarousel` bọc lại nó | Storefront | 🟠 | 0.5 | — | ✅ |
| W-73 | Trang chủ: Mới → Bán chạy → Xu hướng → 2 danh mục → Bộ sưu tập. Ẩn hàng "Xu hướng" khi trùng gần hết với "Bán chạy" | Storefront | 🟠 | 1 | W-71, W-72 | ✅ |
| W-74 | **Cache Redis 5 phút cho `/api/products`** (trước đây không cache; trang chủ giờ gọi 5-6 lần/render). Kèm sửa: variant service chỉ invalidate `PRODUCT_DETAIL`, nay invalidate cả `PRODUCT_LIST`/`COLLECTION_*` — nếu không, sửa giá/tồn sẽ lệch giữa lưới và trang chi tiết tới 5 phút | Infra / Cache | 🔴 | 0.5 | W-70 | ✅ |
| W-75 | Đơn hàng trừ tồn nhưng **không invalidate cache danh sách** → nhãn "Hết hàng" có thể trễ tới 5 phút. Checkout vẫn chặn đúng nên không bán quá, chỉ là trải nghiệm | Infra / Cache | 🟡 | 0.25 | W-74 | ⬜ |
### 2f. Admin dashboard — đợt 2026-08-09  🟡 (giai đoạn 1+2 xong, còn 17 module)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-76 | Sidebar nhóm 10 mục theo nghiệp vụ, `fixed` + `h-screen`, gỡ Tags khỏi menu, Pages → Site pages | Admin UI | 🟠 | 0.5 | — | ✅ |
| W-77 | `SessionExpiredDialog` — **chỉ hiện khi refresh token cũng hỏng**, không hiện mỗi 8 tiếng khi token tự gia hạn | Admin UI | 🟠 | 0.5 | — | ✅ |
| W-78 | `Modal` + `ConfirmDialog` thay `window.confirm`: nêu rõ xoá cái gì, cảnh báo hệ quả, khoá nút khi đang chạy | Admin UI | 🟠 | 0.5 | — | ✅ |
| W-79 | `admin-table.ts` (sort 3 trạng thái, search, lọc khoảng ngày) + `DataTable` + `TableToolbar` — **20 unit test** | Admin UI | 🟠 | 1 | — | ✅ |
| W-80 | `PageHeader` + `FormPage`: breadcrumb + title, Cancel/Save sticky, disable + loading khi submit; layout full width | Admin UI | 🟠 | 0.5 | — | ✅ |
| W-81 | Products new/edit 3 tab + modal biến thể + fallback variant "Standard" — **14 unit test** | Admin UI | 🔴 | 1.5 | W-80 | ✅ |
| W-82 | Danh sách Products: DataTable + toolbar + confirm xoá + **hàng variant thu gọn/mở rộng thẳng cột** (mẫu tham chiếu cho 17 module còn lại) | Admin UI | 🟠 | 1 | W-79 | ✅ |
| W-83 | **Chuyển 17 module còn lại** sang FormPage/DataTable/ConfirmDialog (Categories, Collections, Campaigns, Discounts, Banners, Articles, Jobs, Users, Pages, Settings, Reviews, Orders, Shipping…) | Admin UI | 🟠 | 4–6 | W-82 | ⬜ |
| W-84 | Cột start/end cho Campaigns + các module có khung thời gian (DataTable đã hỗ trợ, cần khai báo cột ở từng trang) | Admin UI | 🟠 | 0.5 | W-83 | ⬜ |

| W-70 | **Sửa lỗi cache bỏ qua query string.** `keyGenerator: () => HẰNG_SỐ` khiến `/collections` và `/collections?withProducts=8` **dùng chung một entry** → trang danh sách collections trắng trơn. Thêm helper `keyWithQuery` + 8 unit test. Sửa luôn lỗi cùng loại ở `/articles` (`?limit=3` của trang chủ đè `?limit=20` của trang blog) | Infra / Cache | 🔴 | 0.5 | — | ✅ |

---

## 2. Ma trận công việc (Task × Module × Phase × Priority × Estimate)

### PHASE 0 — Chặn go-live  ✅ (12/12 hoàn thành)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-01 | Idempotency cho Stripe webhook: guard `order.status !== 'pending_payment'` đầu `markAsPaid`, khóa dòng trong transaction | Payments & Inventory | 🔴 | 1–2 | — | ✅ |
| W-02 | Sàn chống oversell: update tồn có điều kiện `stock >= qty`; nếu 0 dòng ảnh hưởng → huỷ/refund tự động | Payments & Inventory | 🔴 | 2 | W-01 | ✅ |
| W-03 | Giữ hàng (reservation) khi tạo đơn `pending_payment`; nhả lại khi hết hạn/huỷ | Payments & Inventory | 🟠 | 3 | W-02 | ✅ |
| W-04 | Bảng `payments`/`refunds` tách khỏi `orders`; hỗ trợ nhiều lần thử trả & hoàn một phần | Data model | 🟠 | 2–3 | W-01 | ✅ |
| W-05 | Thực thi `requireRole` trên **mọi** route ghi của admin theo Permission Matrix | AuthZ / Roles | 🔴 | 2–3 | — | ✅ |
| W-06 | Gate AI assistant theo role; chặn editor gọi tool ghi; kiểm tra role trong `safeExecute` | AI Assistant | 🔴 | 2 | W-05 | ✅ |
| W-07 | Đổi `create_discount`/`create_banner` sang `destructive:true` + bound bắt buộc (`expiresAt`, trần `maxUses`) | AI Assistant | 🔴 | 1 | W-06 | ✅ |
| W-08 | Thay fulfillment tự động giả bằng luồng admin thao tác tay (`paid→processing→shipped→delivered`) + nhập mã vận đơn thật; tắt auto-advance sau `paid` | Fulfillment | 🔴 | 3–4 | — | ✅ |
| W-09 | Bảng `audit_log`; ghi từ mọi hành động ghi của admin và mọi tool AI (actor, action, entity, before/after, source) | Audit & Security | 🔴 | 3 | W-05 | ✅ |
| W-10 | Rate limiting (`express-rate-limit`) cho auth, `/api/chat`, `/api/admin/assistant` | Audit & Security | 🔴 | 1–2 | — | ✅ |
| W-11 | Trang pháp lý tối thiểu: Điều khoản, Bảo mật, Chính sách đổi trả/hoàn tiền, Vận chuyển | Legal / Content | 🔴 | 2 | — | ✅ |
| W-12 | Scope pending state của assistant theo `adminId` (chống lạm dụng `pendingId` rò rỉ) | AI Assistant | 🟡 | 0.5 | W-06 | ✅ |

### PHASE 1 — Trước launch  ✅ (11/11 hoàn thành)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-13 | FE trang `/auth/reset-password` + `/auth/verify-email` tiêu thụ `?token=` (backend đã xong) | Customer UX | 🟠 | 2 | — | ✅ |
| W-14 | Lưu tổng tiền chốt trên `orders` (`subtotal`, `shipping_fee`, `total`) tại thời điểm đặt | Data model | 🟠 | 1–2 | W-04 | ✅ |
| W-15 | Phí vận chuyển + phương thức/vùng giao: bảng + tính vào tổng đơn | Fulfillment | 🟠 | 3 | W-14 | ✅ |
| W-16 | Bảng `notifications` + trung tâm thông báo in-app cho admin (đơn mới, cần đóng gói) và khách | Notification | 🟠 | 3 | — | ✅ |
| W-17 | Cảnh báo tồn kho thấp (ngưỡng cấu hình) cho admin | Notification | 🟠 | 1–2 | W-16 | ✅ |
| W-18 | Chuyển upload từ đĩa local sang object storage/CDN (S3/Cloudinary) | Infra | 🟠 | 2–3 | — | ✅ |
| W-19 | Endpoint upload CV công khai cho ứng viên — `POST /api/careers/cv` (rate-limit, PDF/DOC/DOCX, ≤10MB, → Cloudinary `declay/cvs`) | Careers | **🟠** | 1–2 | W-18 | ✅ *(xác minh lại 2026-08-05: đã mount & FE `ApplyForm.tsx` đang dùng)* |
| W-20 | Enforce logic verified-purchase khi tạo review; chặn review khống | Reviews | 🟡 | 1 | — | ✅ |
| W-21 | Business rule đơn: không lùi trạng thái; không xoá cứng sản phẩm đã có trong đơn (soft-delete) | Payments & Inventory | 🟡 | 1–2 | — | ✅ |
| W-22 | Health check + log tập trung (structured logging) + cảnh báo lỗi cơ bản | Infra / Observability | 🟡 | 2 | — | ✅ |
| W-23 | Hoàn thiện module `tags` (service/route/FE) — hiện chỉ có entity | Catalog | 🟢 | 2 | — | ✅ |

### PHASE 2 — Sau launch / tăng trưởng  ⬜ (chưa bắt đầu, trừ W-32 một phần)

| ID | Công việc | Module | Priority | Est (ngày) | Phụ thuộc | Tình trạng |
|---|---|---|:--:|:--:|---|:--:|
| W-24 | Dashboard/report admin: doanh thu, đơn theo trạng thái, bán chạy, tồn thấp, dùng mã | Reporting | 🟠 | 4–5 | W-09,W-14 | ⬜ |
| W-25 | Tích hợp đơn vị vận chuyển thật (GHN/GHTK/VNPost): tạo vận đơn, đồng bộ trạng thái | Fulfillment | 🟠 | 5–8 | W-08,W-15 | ⬜ |
| W-26 | Thêm cổng thanh toán nội địa (VNPay/Momo) song song Stripe | Payments | 🟠 | 5–8 | W-04 | ⬜ |
| W-27 | Quy trình đổi/trả (RMA) có trạng thái, không chỉ refund Stripe | Order Mgmt | 🟡 | 3–4 | W-04 | ⬜ |
| W-28 | SEO: sitemap, OG tags, structured data cho sản phẩm/bài viết | Storefront / SEO | 🟡 | 2–3 | — | ⬜ |
| W-29 | Hoá đơn điện tử / nghĩa vụ thuế (nếu áp dụng ở VN) | Compliance | 🟡 | TBD | — | ⬜ |
| W-30 | Kênh thông báo VN (Zalo/SMS OTP) nếu cần | Notification | 🟢 | 3 | W-16 | ⬜ |
| W-31 | Made-to-order (hàng làm theo yêu cầu, không giữ tồn) nếu mô hình cần | Catalog / Inventory | 🟢 | 3–4 | — | ⬜ |
| W-32 | Kiểm thử tự động (unit/integration) cho luồng tiền & kho | QA | 🟠 | 4 | W-01..W-04 | 🟡 Một phần |
| W-33 | Audit trail UI: màn hình tra cứu `audit_log` cho super_admin | Audit & Security | 🟢 | 2 | W-09 | ⬜ |

### 2b. BỔ SUNG — Ngoài kế hoạch gốc (đã hoàn thành sau khi chốt P0/P1)

Các hạng mục dưới đây phát sinh theo yêu cầu kinh doanh (khuyến mãi, merchandising) và nâng cấp trải nghiệm; không có trong WBS W-01→W-33 ban đầu nhưng đã được xây dựng & kiểm thử (tsc/parse sạch, unit test cho pricing).

| ID | Công việc | Module | Tình trạng |
|---|---|---|:--:|
| E-01 | Special price theo biến thể (`product_variants.special_price`); giá hiệu lực = min(base, special) — nguồn chân lý ở `lib/pricing.ts`, áp cho cả checkout charge | Pricing | ✅ |
| E-02 | Module **Campaign**: giảm % chung theo lịch (starts/ends, is_active) cho nhóm sản phẩm; nhiều campaign lấy % sâu nhất; migration 012, admin CRUD, badge storefront | Pricing / Promotion | ✅ |
| E-03 | Module **Collections**: nhóm sản phẩm (slug, sort_order); trang `/collections` + `/collections/[slug]`; migration 013; admin CRUD | Merchandising | ✅ |
| E-04 | Đồng bộ giá campaign vào giỏ hàng/checkout (khớp số tiền charge thật ở `cart.service` + FE) | Pricing | ✅ |
| E-05 | Lọc sản phẩm theo Collection + `minPrice`/`maxPrice` (backend); filter storefront kiểu Nike (accordion Category/Collection/Shop By Price) | Catalog / Storefront | ✅ |
| E-06 | Trang Shop: **infinite scroll** (IntersectionObserver) thay phân trang số; sidebar filter + toolbar **sticky**; sửa lỗi header trôi (`min-h-screen`) | Storefront UX | ✅ |
| E-07 | Header: nav ra giữa, **search kiểu Nike** (overlay full-width + Popular Search Terms + Cancel), mega menu 1 hàng có 'By Collection' | Storefront UX | ✅ |
| E-08 | **Design system** shadcn/ui + Radix (button/input/textarea/label/checkbox/select/dialog/popover) + **date picker** (Calendar native) — gắn vào campaign, ngày sinh đăng ký, dropdown Sort | UI Foundation | ✅ |
| E-09 | Form đăng ký nâng cao (DOB, phone có prefix + cờ nước, confirm password, rules, toggle, điều khoản); layout auth riêng không header/footer; toàn site English | Customer UX | ✅ |

> **Còn thiếu ở nhóm bổ sung:** viết unit/integration test riêng cho campaign / collection / lọc giá (gộp vào W-32); chuẩn hoá nốt các form admin còn lại sang bộ UI mới (Dialog thay `confirm()`, các `<select>` còn lại → `Select`).

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

> **Trạng thái 2026-07-16:** Sprint 1→4 (W-01→W-23) đã hoàn thành; đồng thời đã bổ sung nhóm E-01→E-09 (mục 2b).

**Sau đó (P2):** W-24 → W-33 theo nhu cầu kinh doanh — chưa bắt đầu (trừ W-32 đã có một phần: bộ test luồng tiền/kho).

---

## 5. Câu hỏi mở đang chặn phạm vi (cần product owner chốt)

1. **Fulfillment:** chọn (a) admin thao tác tay ngay, hay (b) tích hợp carrier thật (GHN/GHTK/VNPost) ngay từ launch? Ảnh hưởng W-08 vs W-25.
2. **Thanh toán:** chỉ Stripe hay cần VNPay/Momo nội địa ngay? Ảnh hưởng W-26 lên/xuống phase.
3. **Kho:** một kho tập trung, hay có cả made-to-order không giữ tồn? Ảnh hưởng W-03, W-31.
4. **Pháp lý:** có nghĩa vụ hoá đơn điện tử/thuế khi bán ở VN? Ảnh hưởng W-29.

---

## 6. Definition of Done toàn cục (áp cho mọi hạng mục)

Một hạng mục chỉ "xong" khi: có code + test (đơn vị hoặc tích hợp cho luồng quan trọng), qua review, cập nhật tài liệu liên quan (BRD/SRS/data dictionary nếu đổi schema), có UAT scenario được QA xác nhận, và không để lại cờ tạm/dữ liệu giả trong môi trường production.
