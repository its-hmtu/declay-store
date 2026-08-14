# Declay Store — Đặc tả Yêu cầu Chức năng (SRS)

**Loại tài liệu:** Software Requirements Specification (SRS) — yêu cầu chức năng & phi chức năng
**Sản phẩm:** Declay Store — nền tảng thương mại điện tử bán figure thủ công (handmade)
**Phiên bản:** v3.0 · **Ngày:** 2026-08-08
**Phương pháp:** Reverse-engineering từ mã nguồn (`code/web-api`, `code/web-fe`) đối chiếu với tài liệu `docs/discovery/` và `docs/business-analysis/`
**Đối tượng đọc:** Product Owner, BA, Dev, QA

> **Nguyên tắc của tài liệu này:** mỗi yêu cầu chức năng đều được neo vào bằng chứng trong mã nguồn (endpoint, entity, hoặc màn hình). Những chỗ mã nguồn và tài liệu cũ mâu thuẫn nhau được ghi rõ ở §12.
>
> **Ký hiệu mức độ ưu tiên:** M = Must · S = Should · C = Could
> **Ký hiệu trạng thái:** ✅ Đã có trong mã nguồn · 🟡 Có một phần / phụ thuộc cấu hình · 🔴 Chưa triển khai

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu mô tả đầy đủ các yêu cầu chức năng của hệ thống Declay Store ở trạng thái hiện tại, làm cơ sở cho: kiểm thử chấp nhận (UAT), lập kế hoạch phát triển tiếp theo, bàn giao và đào tạo vận hành.

### 1.2 Phạm vi hệ thống

Declay Store là nền tảng bán lẻ trực tuyến **một thương hiệu** (không phải sàn đa người bán), gồm ba bề mặt dùng chung một backend:

| Bề mặt | Vị trí mã nguồn | Vai trò |
|---|---|---|
| **Storefront** | `web-fe/app/(storefront)`, `app/(auth)` | Cửa hàng công khai: duyệt sản phẩm, giỏ hàng, thanh toán, theo dõi đơn, blog, tuyển dụng, chat hỗ trợ |
| **Admin Dashboard** | `web-fe/app/admin/(protected)` | Quản trị nội bộ: catalogue, đơn hàng, khuyến mãi, nội dung, tuyển dụng, báo cáo, hộp thư live chat, trợ lý AI |
| **Web API** | `web-api/src` | REST API (Express + TypeScript) phục vụ cả hai bề mặt |

### 1.3 Ngoài phạm vi

Sàn đa người bán; POS/bán tại cửa hàng; đăng ký định kỳ (subscription/recurring billing); ứng dụng di động native; quản lý kho đa điểm.

### 1.4 Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| **Product** | Sản phẩm cha (tên, mô tả, danh mục). **Không chứa giá và tồn kho.** |
| **Product Variant** | Phiên bản con của sản phẩm — chứa `price`, `specialPrice`, `stock`, `images[]`, kích thước/khối lượng vận chuyển |
| **Campaign** | Chương trình giảm giá theo % áp cho một tập sản phẩm, có thời gian hiệu lực |
| **Discount code** | Mã giảm giá nhập tại thanh toán (percent hoặc fixed) |
| **Collection** | Bộ sưu tập sản phẩm dùng để trưng bày/merchandising |
| **Guest order** | Đơn hàng đặt không cần đăng nhập, tra cứu bằng `guestToken` |
| **Handoff** | Việc chuyển phiên chat từ chatbot AI sang nhân viên thật |
| **GHN** | Giao Hàng Nhanh — nhà vận chuyển tích hợp |
| **Reservation** | Việc giữ tồn kho khi đơn ở trạng thái `pending_payment` |

### 1.5 Tài liệu tham chiếu

- `docs/discovery/*` — kết quả khảo sát nghiệp vụ ban đầu
- `docs/business-analysis/01-requirements-brd-srs.md` — BRD/SRS v2 (2026-07)
- `docs/business-analysis/07-cancellation-return-refund-design.md` — thiết kế huỷ/trả/hoàn tiền
- `docs/business-analysis/08-recommendation-engine-design.md` — thiết kế hệ gợi ý
- `code/CLAUDE.md` — quy ước kiến trúc và mã nguồn

---

## 2. Tổng quan hệ thống

### 2.1 Kiến trúc

```
┌──────────────────┐      ┌──────────────────┐
│   Storefront     │      │  Admin Dashboard │      Next.js 16 / React 19
│  (storefront)    │      │ admin/(protected)│      Tailwind v4
└────────┬─────────┘      └────────┬─────────┘
         │  REST + SSE (NEXT_PUBLIC_API_URL)
         └────────────┬─────────────┘
                      ▼
         ┌────────────────────────────┐
         │   Web API — Express 4 / TS │
         │   /api/*  &  /api/admin/*  │
         └──┬──────┬───────┬───────┬──┘
            │      │       │       │
   PostgreSQL   Redis   BullMQ   External:
   (Sequelize) (cache) (queues)  Stripe · VNPay · GHN
                                 Google OAuth · SMTP · Claude API
```

### 2.2 Công việc nền (BullMQ)

| Hàng đợi | Chức năng |
|---|---|
| `reservation` | Hết hạn giữ tồn kho — huỷ đơn `pending_payment` quá hạn và trả tồn kho |
| `email` | Gửi email giao dịch bất đồng bộ |
| `ghn-sync` | Đồng bộ danh mục tỉnh/huyện/xã/dịch vụ GHN |
| `recommendation` | Dựng lại bảng mua-chung (co-occurrence) cho hệ gợi ý |
| `return-expiry` | Quét và đóng các yêu cầu trả hàng quá hạn |

---

## 3. Tác nhân (Actors) và Phân quyền

### 3.1 Danh sách tác nhân

| Tác nhân | Loại | Mô tả |
|---|---|---|
| **Khách vãng lai (Guest)** | Người, chưa đăng nhập | Duyệt catalogue, tìm kiếm, đọc blog/tuyển dụng, chat với bot, **đặt hàng không cần tài khoản**, tra cứu đơn bằng mã + token |
| **Khách hàng (Customer)** | Người, đã đăng nhập | Toàn bộ quyền của Guest + hồ sơ, sổ địa chỉ, giỏ hàng lưu bền, wishlist, lịch sử đơn, đánh giá, huỷ/trả hàng, thông báo |
| **Editor** | Nhân viên | Quản lý bộ sưu tập, đối soát COD, trả lời live chat |
| **Admin** | Nhân viên | Toàn bộ quyền Editor + catalogue, đơn hàng, vận chuyển, khuyến mãi, nội dung, tuyển dụng, báo cáo, trợ lý AI |
| **Super Admin** | Nhân viên | Toàn bộ quyền Admin + quản lý tài khoản quản trị |
| **Chatbot Storefront** | Hệ thống AI | Trợ lý **chỉ đọc**: hỏi đáp sản phẩm, trạng thái đơn, chính sách |
| **Trợ lý AI Admin** | Hệ thống AI | Trợ lý **có quyền ghi** qua tool-use, yêu cầu xác nhận với hành động phá huỷ |
| **Stripe / VNPay** | Hệ thống ngoài | Cổng thanh toán; webhook/IPN là nguồn sự thật về trạng thái thanh toán |
| **GHN** | Hệ thống ngoài | Báo giá, tạo vận đơn, webhook cập nhật trạng thái giao hàng |
| **Google OAuth** | Hệ thống ngoài | Đăng nhập liên kết |
| **SMTP** | Hệ thống ngoài | Email giao dịch |
| **Claude API** | Hệ thống ngoài | LLM cho cả hai bề mặt AI |

### 3.2 Ma trận phân quyền quản trị

Vai trò lưu tại `admin_users.role`, kiểm soát bởi `requireRole()` (`middlewares/admin.middleware.ts`).

| Nhóm chức năng | editor | admin | super_admin |
|---|:--:|:--:|:--:|
| Quản lý tài khoản quản trị (`/admin/users`) | — | — | ✔ |
| Sản phẩm, biến thể, danh mục, tag | — | ✔ | ✔ |
| Đơn hàng, vận đơn, huỷ/trả/hoàn tiền | — | ✔ | ✔ |
| Mã giảm giá, chiến dịch | — | ✔ | ✔ |
| Bài viết, banner, trang tĩnh, cấu hình site | — | ✔ | ✔ |
| Tuyển dụng (jobs + hồ sơ ứng tuyển) | — | ✔ | ✔ |
| Kiểm duyệt đánh giá | — | ✔ | ✔ |
| Báo cáo & phân tích | — | ✔ | ✔ |
| Trợ lý AI Admin | — | ✔ | ✔ |
| Bộ sưu tập (collections) | ✔ | ✔ | ✔ |
| Đối soát COD | ✔ | ✔ | ✔ |
| Hộp thư live chat | ✔ | ✔ | ✔ |

> **Quan sát:** vai trò `editor` hiện chỉ mở ba nhóm quyền; tài liệu cũ mô tả editor quản lý nội dung (bài viết, banner) nhưng mã nguồn **không** cấp quyền đó. Xem §12-D4.

---

## 4. Danh mục Use Case

### 4.1 Storefront

| Mã | Use case | Tác nhân |
|---|---|---|
| UC-01 | Đăng ký / đăng nhập / đăng nhập Google | Guest |
| UC-02 | Xác thực email, quên & đặt lại mật khẩu | Guest / Customer |
| UC-03 | Duyệt & lọc catalogue, tìm kiếm | Guest, Customer |
| UC-04 | Xem chi tiết sản phẩm và chọn biến thể | Guest, Customer |
| UC-05 | Quản lý giỏ hàng | Guest, Customer |
| UC-06 | Quản lý wishlist | Customer |
| UC-07 | Thanh toán (Stripe / VNPay / COD) | Guest, Customer |
| UC-08 | Theo dõi đơn hàng & vận đơn | Guest (token), Customer |
| UC-09 | Yêu cầu huỷ đơn | Customer |
| UC-10 | Yêu cầu trả hàng lỗi theo từng món | Customer |
| UC-11 | Viết / sửa / xoá đánh giá sản phẩm | Customer |
| UC-12 | Quản lý hồ sơ, mật khẩu, sổ địa chỉ | Customer |
| UC-13 | Đọc blog, trang chính sách | Guest, Customer |
| UC-14 | Xem tin tuyển dụng và nộp hồ sơ (kèm CV) | Guest |
| UC-15 | Chat với bot AI và yêu cầu gặp nhân viên | Guest, Customer |
| UC-16 | Nhận gợi ý sản phẩm & xem sản phẩm đã xem | Guest, Customer |

### 4.2 Admin Dashboard

| Mã | Use case | Vai trò tối thiểu |
|---|---|---|
| UC-20 | Đăng nhập quản trị | mọi vai trò |
| UC-21 | Quản lý sản phẩm & biến thể (CRUD, ảnh, tồn kho) | admin |
| UC-22 | Quản lý danh mục, tag, bộ sưu tập | admin / editor (collections) |
| UC-23 | Xử lý đơn hàng: xem, đổi trạng thái | admin |
| UC-24 | Tạo & đồng bộ vận đơn GHN, mô phỏng tracking | admin |
| UC-25 | Duyệt/từ chối yêu cầu huỷ đơn | admin |
| UC-26 | Duyệt/từ chối/nhận hàng trả và hoàn tiền | admin |
| UC-27 | Đối soát tiền mặt COD | editor |
| UC-28 | Quản lý mã giảm giá & chiến dịch (kèm preview tác động) | admin |
| UC-29 | Quản lý bài viết, banner, trang tĩnh (có phiên bản) | admin |
| UC-30 | Quản lý tuyển dụng & hồ sơ ứng tuyển | admin |
| UC-31 | Kiểm duyệt đánh giá | admin |
| UC-32 | Xem báo cáo & phân tích | admin |
| UC-33 | Cấu hình site (site settings), phương thức vận chuyển | admin |
| UC-34 | Trả lời khách trong hộp thư live chat | mọi vai trò |
| UC-35 | Sử dụng trợ lý AI để thao tác nghiệp vụ | admin |
| UC-36 | Quản lý tài khoản quản trị | super_admin |

---

## 5. Yêu cầu chức năng — Xác thực & Tài khoản

### 5.1 Xác thực khách hàng

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-AUTH-01 | Hệ thống cho phép đăng ký tài khoản bằng email + mật khẩu; email phải là duy nhất | M | ✅ |
| FR-AUTH-02 | Sau khi đăng ký, hệ thống gửi email xác thực chứa token có hạn; người dùng xác thực qua `POST /api/auth/verify-email` | M | ✅ |
| FR-AUTH-03 | Hệ thống cho phép đăng nhập bằng email + mật khẩu, trả về access token và refresh token (JWT) | M | ✅ |
| FR-AUTH-04 | Hệ thống cho phép đăng nhập bằng Google OAuth 2.0; tài khoản Google được ghi nhận qua `googleId` / `authProvider` | M | ✅ |
| FR-AUTH-05 | Hệ thống cho phép làm mới access token bằng refresh token (`POST /api/auth/refresh`) | M | ✅ |
| FR-AUTH-06 | Hệ thống cho phép đăng xuất và vô hiệu hoá token hiện tại (denylist theo `jti`) | M | ✅ |
| FR-AUTH-07 | Hệ thống cho phép yêu cầu đặt lại mật khẩu qua email và đặt lại bằng token dùng một lần | M | ✅ |
| FR-AUTH-08 | Các endpoint xác thực bị giới hạn tần suất (mặc định 20 lần / 15 phút / IP) | M | ✅ |
| FR-AUTH-09 | Mật khẩu được lưu dưới dạng băm; không bao giờ trả về trong response | M | ✅ |
| FR-AUTH-10 | Token đặt lại mật khẩu và token xác thực email chỉ dùng được một lần (`usedAt`) và có `expiresAt` | M | ✅ |

### 5.2 Hồ sơ & Địa chỉ

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-USR-01 | Khách hàng xem được thông tin tài khoản của mình (`GET /api/users/info`) | M | ✅ |
| FR-USR-02 | Khách hàng cập nhật được họ tên, username, số điện thoại, ngày sinh | M | ✅ |
| FR-USR-03 | Khách hàng đổi mật khẩu sau khi xác thực mật khẩu hiện tại | M | ✅ |
| FR-ADR-01 | Khách hàng tạo, sửa, xoá, xem danh sách địa chỉ nhận hàng | M | ✅ |
| FR-ADR-02 | Địa chỉ gồm: người nhận, SĐT, địa chỉ chi tiết, phường/xã, quận/huyện, tỉnh/thành, quốc gia, mã bưu chính, loại địa chỉ (home/work/other) | M | ✅ |
| FR-ADR-03 | Một địa chỉ có thể được đánh dấu mặc định (`isDefault`) | S | ✅ |
| FR-ADR-04 | Địa chỉ lưu thêm mã GHN (`ghnProvinceId`, `ghnDistrictId`, `ghnWardCode`) để phục vụ báo giá và tạo vận đơn | M | ✅ |
| FR-ADR-05 | Khi khách vãng lai đặt hàng, hệ thống tạo bản ghi địa chỉ không gắn `userId` | M | ✅ |

### 5.3 Xác thực quản trị

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-ADM-01 | Quản trị viên đăng nhập qua endpoint riêng `POST /api/admin/auth/login`, dùng bảng `admin_users` và khoá JWT riêng | M | ✅ |
| FR-ADM-02 | Hệ thống **không** cho phép dùng token khách hàng để truy cập route quản trị và ngược lại | M | ✅ |
| FR-ADM-03 | Super admin tạo, sửa, xoá, xem tài khoản quản trị và gán vai trò (`super_admin` / `admin` / `editor`) | M | ✅ |
| FR-ADM-04 | Tài khoản quản trị có cờ `isActive`; tài khoản ngừng hoạt động không đăng nhập được | M | ✅ |
| FR-ADM-05 | Hệ thống cho phép thu hồi toàn bộ phiên của một quản trị viên (kiểm tra `iat` so với mốc thu hồi) | S | ✅ |

---

## 6. Yêu cầu chức năng — Catalogue & Khám phá sản phẩm

### 6.1 Sản phẩm và biến thể

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CAT-01 | Sản phẩm gồm: danh mục, tên, slug duy nhất, mô tả, cờ hiển thị, lượt xem. **Không chứa giá/tồn kho** | M | ✅ |
| FR-CAT-02 | Mỗi sản phẩm có ≥1 biến thể; biến thể chứa tên, giá, giá khuyến mãi, giá vốn, tồn kho, danh sách ảnh, cờ hiển thị | M | ✅ |
| FR-CAT-03 | Biến thể lưu thông số vận chuyển: khối lượng (gram), dài/rộng/cao (cm) — dùng để báo giá GHN | M | ✅ |
| FR-CAT-04 | Admin thực hiện CRUD sản phẩm (`/api/admin/products`) và CRUD biến thể (`/api/admin/products/:id/variants`) | M | ✅ |
| FR-CAT-05 | Slug sản phẩm chỉ chấp nhận chữ thường, số và dấu gạch nối | M | ✅ |
| FR-CAT-06 | Storefront xem chi tiết sản phẩm theo slug, kèm toàn bộ biến thể đang hoạt động | M | ✅ |
| FR-CAT-07 | Hệ thống ghi nhận lượt xem sản phẩm (`products.views` và bảng `product_view_events`) | S | ✅ |
| FR-CAT-08 | Xoá sản phẩm không được làm mất dữ liệu lịch sử đơn hàng (đơn lưu snapshot tên/giá tại thời điểm mua) | M | ✅ |

### 6.2 Phân loại & trưng bày

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CAT-10 | Danh mục có cấu trúc cây (`parentId`), slug duy nhất, cờ hiển thị; admin CRUD được | M | ✅ |
| FR-CAT-11 | Tag gắn nhiều-nhiều với sản phẩm; admin CRUD được | S | ✅ |
| FR-CAT-12 | Bộ sưu tập (collection) nhóm nhiều sản phẩm, có slug, thứ tự hiển thị, cờ kích hoạt; hiển thị tại `/collections` | S | ✅ |
| FR-CAT-13 | Banner trang chủ có ảnh, tiêu đề, liên kết, thứ tự, cờ kích hoạt và khung thời gian hiệu lực (`startsAt`/`endsAt`) | S | ✅ |

### 6.3 Tìm kiếm và lọc

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-SRCH-01 | Storefront lọc sản phẩm theo: danh mục, bộ sưu tập, khoảng giá (`minPrice`/`maxPrice`), từ khoá (`search`, ≤100 ký tự) | M | ✅ |
| FR-SRCH-02 | Danh sách sản phẩm hỗ trợ sắp xếp theo các tuỳ chọn định nghĩa trong `PRODUCT_SORTS` | M | ✅ |
| FR-SRCH-03 | Danh sách sản phẩm phân trang (`page`, `limit`, mặc định 20) và trả về metadata phân trang | M | ✅ |
| FR-SRCH-04 | Các endpoint danh sách công khai được cache (Redis) với TTL cấu hình được; cache bị vô hiệu khi dữ liệu thay đổi | S | ✅ |

### 6.4 Gợi ý sản phẩm

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-RECO-01 | Hệ thống gợi ý sản phẩm theo ngữ cảnh: `home`, `detail`, `cart`, `post_purchase`, `account` | S | ✅ |
| FR-RECO-02 | Thuật toán theo thứ tự ưu tiên: mua-chung (co-occurrence) → tương đồng nội dung → phổ biến; **không dùng ML** | S | ✅ |
| FR-RECO-03 | Cặp mua-chung chỉ được tính khi xuất hiện trong ≥ N đơn (mặc định N=2, cấu hình `RECO_COOCCURRENCE_MIN`) và bỏ qua đơn `pending_payment`/`cancelled` | S | ✅ |
| FR-RECO-04 | Kết quả gợi ý loại bỏ: sản phẩm neo, sản phẩm đã có trong giỏ, sản phẩm đã mua, sản phẩm hết hàng; đồng thời đa dạng hoá theo danh mục | S | ✅ |
| FR-RECO-05 | Hệ thống lưu lịch sử xem gần đây và hiển thị "Sản phẩm đã xem" cho cả khách vãng lai (theo `sessionId`) và khách đăng nhập | S | ✅ |
| FR-RECO-06 | Hệ thống ghi nhận sự kiện hiển thị và click gợi ý (`recommendation_events`) để tính CTR | S | ✅ |
| FR-RECO-07 | Bảng mua-chung được dựng lại định kỳ bằng job nền | S | ✅ |

---

## 7. Yêu cầu chức năng — Giỏ hàng, Đặt hàng & Thanh toán

### 7.1 Giỏ hàng và wishlist

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CART-01 | Giỏ hàng lưu theo `userId` (khách đăng nhập) hoặc `sessionId` (khách vãng lai) | M | ✅ |
| FR-CART-02 | Dòng giỏ hàng tham chiếu **biến thể** (`variantId`), không phải sản phẩm | M | ✅ |
| FR-CART-03 | Khách thêm, sửa số lượng, xoá từng dòng và xoá toàn bộ giỏ | M | ✅ |
| FR-CART-04 | Giỏ hàng hiển thị đơn giá hiệu lực (đã áp `specialPrice` và chiến dịch đang chạy) | M | ✅ |
| FR-CART-05 | Wishlist cho phép khách đăng nhập lưu/xoá biến thể yêu thích và xoá toàn bộ | S | ✅ |

### 7.2 Khuyến mãi

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-DISC-01 | Mã giảm giá có: mã (chuẩn hoá chữ hoa), loại (`percent`/`fixed`), giá trị, giá trị đơn tối thiểu, số lượt tối đa, số lượt đã dùng, hạn dùng, cờ kích hoạt | M | ✅ |
| FR-DISC-02 | Hệ thống từ chối mã khi: không tồn tại, không kích hoạt, hết hạn, hết lượt, hoặc đơn chưa đạt giá trị tối thiểu — kèm thông báo lý do cụ thể | M | ✅ |
| FR-DISC-03 | Số tiền giảm **không bao giờ vượt quá** giá trị đơn hàng | M | ✅ |
| FR-DISC-04 | Khách kiểm tra trước hiệu lực mã tại giỏ hàng (`POST /api/discounts/validate`) trước khi đặt hàng | M | ✅ |
| FR-DISC-05 | Chiến dịch (campaign) giảm theo % áp cho tập sản phẩm trong khung thời gian; khi nhiều chiến dịch trùng, hệ thống chọn chiến dịch "thắng" cho từng sản phẩm | S | ✅ |
| FR-DISC-06 | Admin xem trước tác động của chiến dịch trước khi lưu (`POST /api/admin/campaigns/preview-impact`) | S | ✅ |
| FR-DISC-07 | Khi đặt hàng, dòng đơn lưu snapshot: giá gốc, tên chiến dịch, % giảm và số tiền giảm của chiến dịch | M | ✅ |
| FR-DISC-08 | Mã giảm giá và chiến dịch có thể áp đồng thời: chiến dịch tác động lên đơn giá, mã giảm giá tác động lên tổng tiền hàng | S | ✅ |

### 7.3 Thanh toán (Checkout)

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CHK-01 | Hệ thống hỗ trợ đặt hàng cho **cả khách vãng lai và khách đăng nhập** (`optionalAuth` trên `POST /api/orders/checkout`) | M | ✅ |
| FR-CHK-02 | Khách vãng lai phải cung cấp tên, email, số điện thoại; hệ thống sinh `guestToken` để tra cứu đơn về sau | M | ✅ |
| FR-CHK-03 | Hệ thống hỗ trợ 3 phương thức thanh toán: `stripe`, `vnpay`, `cod` | M | ✅ |
| FR-CHK-04 | Công thức tổng tiền: `tổng tiền hàng − giảm giá + phí vận chuyển`, làm tròn 2 chữ số | M | ✅ |
| FR-CHK-05 | Đơn hàng được tạo ở trạng thái `pending_payment` và **giữ tồn kho ngay** bằng cách trừ `stock` của biến thể | M | ✅ |
| FR-CHK-06 | Nếu đơn `pending_payment` không được thanh toán trong thời gian giữ chỗ, job nền tự huỷ đơn và hoàn trả tồn kho | M | ✅ |
| FR-CHK-07 | Với Stripe, hệ thống tạo PaymentIntent và trả `clientSecret` cho frontend | M | ✅ |
| FR-CHK-08 | Với VNPay, hệ thống dựng URL thanh toán có chữ ký HMAC và chuyển hướng khách | M | ✅ |
| FR-CHK-09 | Với COD, đơn được tạo mà không gọi cổng thanh toán; tiền được ghi nhận khi đối soát sau giao hàng | M | ✅ |
| FR-CHK-10 | Mỗi đơn có mã đơn hàng (`orderCode`) thân thiện để khách tra cứu | M | ✅ |
| FR-CHK-11 | Đơn lưu snapshot tên sản phẩm, tên biến thể và đơn giá tại thời điểm mua | M | ✅ |
| FR-CHK-12 | Sau khi đặt hàng thành công, giỏ hàng của khách được xoá | M | ✅ |
| FR-CHK-13 | Hệ thống gửi email xác nhận đơn hàng (qua hàng đợi email) | M | ✅ |
| FR-CHK-14 | Hệ thống cảnh báo admin khi biến thể xuống dưới ngưỡng tồn kho thấp sau khi đặt hàng | S | ✅ |
| FR-CHK-15 | Toàn bộ thao tác tạo đơn + trừ tồn kho chạy trong một transaction cơ sở dữ liệu | M | ✅ |

### 7.4 Xử lý thanh toán và đối soát

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-PAY-01 | Trạng thái thanh toán do **webhook/IPN của cổng thanh toán quyết định**, không tin dữ liệu từ client | M | ✅ |
| FR-PAY-02 | Webhook Stripe (`POST /api/webhooks/stripe`) nhận raw body và xác thực chữ ký | M | ✅ |
| FR-PAY-03 | VNPay có cả IPN (`/api/webhooks/vnpay`) và verify-return; chữ ký được kiểm tra trước khi ghi nhận | M | ✅ |
| FR-PAY-04 | Hệ thống chống xử lý trùng webhook bằng bảng `processed_webhook_events` (provider + eventId) | M | ✅ |
| FR-PAY-05 | Việc chuyển `pending_payment → paid` dùng khoá dòng (`SELECT ... FOR UPDATE`) để tránh cập nhật đồng thời | M | ✅ |
| FR-PAY-06 | Bản ghi `payments` lưu: phương thức, nhà cung cấp, mã tham chiếu giao dịch, số tiền/đơn vị tiền thực thu, tỷ giá FX, trạng thái | M | ✅ |
| FR-PAY-07 | VNPay chỉ nhận VND; hệ thống quy đổi, làm tròn theo bội 1.000 VND và từ chối đơn dưới 5.000 VND | M | ✅ |
| FR-PAY-08 | Với COD, admin/editor xem danh sách chờ đối soát và ghi nhận số tiền carrier nộp về | M | ✅ |
| FR-PAY-09 | Đối soát COD chỉ thực hiện được khi đơn ở trạng thái `delivered` hoặc `returned`, và chỉ một lần | M | ✅ |
| FR-PAY-10 | Đối soát so sánh tiền thu với tiền phải thu, phân loại `matched` / `short` / `over` (dung sai 0,01) và **ghi nhận chênh lệch thay vì bỏ qua** | M | ✅ |

---

## 8. Yêu cầu chức năng — Vòng đời Đơn hàng

### 8.1 Trạng thái đơn hàng

```
pending_payment ──► paid ──► processing ──► shipped ──► delivered ──► returned
       │              │           │            │
       └──────────────┴───────────┴────────────┴──────────► cancelled
```

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-ORD-01 | Trạng thái đơn thuộc tập: `pending_payment`, `paid`, `processing`, `shipped`, `delivered`, `returned`, `cancelled` | M | ✅ |
| FR-ORD-02 | Hệ thống **không cho lùi trạng thái**; ngoại lệ duy nhất là chuyển sang `cancelled` | M | ✅ |
| FR-ORD-03 | `delivered`, `cancelled`, `returned` là trạng thái kết thúc — không thể đổi tiếp bằng endpoint đổi trạng thái thông thường | M | ✅ |
| FR-ORD-04 | Khách đăng nhập xem danh sách đơn của mình (có phân trang) và chi tiết từng đơn | M | ✅ |
| FR-ORD-05 | Khách vãng lai tra cứu đơn bằng `GET /api/orders/lookup` và xem tóm tắt qua `guestToken` | M | ✅ |
| FR-ORD-06 | Khách không truy cập được đơn của người khác | M | ✅ |
| FR-ORD-07 | Admin xem danh sách toàn bộ đơn (lọc, phân trang) và chi tiết đơn | M | ✅ |
| FR-ORD-08 | Admin đổi trạng thái đơn (`PUT /api/admin/orders/:id/status`) theo đúng ràng buộc chuyển trạng thái | M | ✅ |
| FR-ORD-09 | Mỗi lần đổi trạng thái, hệ thống gửi email thông báo cho khách | M | ✅ |
| FR-ORD-10 | Storefront hiển thị dòng thời gian trạng thái đơn (`OrderTimeline`, `OrderProgress`) | S | ✅ |
| FR-ORD-11 | Đơn lưu các mốc thời gian: `paidAt`, `processingAt`, `deliveredAt`, `returnedAt` | M | ✅ |

### 8.2 Huỷ đơn

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CAN-01 | Khách chỉ được yêu cầu huỷ khi đơn ở `pending_payment`, `paid` hoặc `processing`; các trạng thái khác bị chặn | M | ✅ |
| FR-CAN-02 | Nếu đơn **chưa có vận đơn GHN thật** → huỷ ngay lập tức | M | ✅ |
| FR-CAN-03 | Nếu đơn **đã có vận đơn GHN** → tạo `cancellation_request` ở trạng thái `pending` chờ admin duyệt | M | ✅ |
| FR-CAN-04 | Mỗi đơn chỉ tồn tại tối đa một yêu cầu huỷ đang chờ | M | ✅ |
| FR-CAN-05 | Khi huỷ thành công, toàn bộ tồn kho của các dòng đơn được hoàn trả | M | ✅ |
| FR-CAN-06 | Hoàn tiền chỉ phát sinh khi đã thực thu (tồn tại `payment` trạng thái `succeeded`); đơn COD chưa giao không hoàn tiền | M | ✅ |
| FR-CAN-07 | Admin xem danh sách yêu cầu huỷ và duyệt/từ chối (`/api/admin/orders/cancellations/:id/approve|reject`) | M | ✅ |
| FR-CAN-08 | Khi duyệt huỷ đơn có vận đơn, hệ thống gọi GHN huỷ vận đơn và lưu kết quả (`ghnCancelResult`) | M | ✅ |
| FR-CAN-09 | Việc huỷ chạy trong transaction có khoá dòng để tránh huỷ trùng | M | ✅ |

### 8.3 Trả hàng và hoàn tiền

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-RET-01 | Chỉ đơn ở trạng thái `delivered` mới được yêu cầu trả hàng | M | ✅ |
| FR-RET-02 | Cửa sổ trả hàng là **7 ngày** kể từ `deliveredAt`; quá hạn hệ thống từ chối kèm ngày hết hạn | M | ✅ |
| FR-RET-03 | Chính sách chỉ nhận trả **hàng lỗi/sai**, không nhận trả vì đổi ý | M | ✅ |
| FR-RET-04 | Khách chọn trả **theo từng món** với số lượng cụ thể; số lượng trả không vượt quá số lượng đã mua trừ số đã trả trước đó | M | ✅ |
| FR-RET-05 | Mỗi món trả **bắt buộc kèm ít nhất một ảnh bằng chứng** (upload qua `/api/returns`) | M | ✅ |
| FR-RET-06 | Số tiền hoàn = tiền hàng các món trả; nếu trả **toàn bộ** đơn thì cộng thêm phí vận chuyển gốc, trả một phần thì không | M | ✅ |
| FR-RET-07 | Admin duyệt, từ chối, và xác nhận đã nhận hàng trả (`approve` / `reject` / `receive`) | M | ✅ |
| FR-RET-08 | Đơn trả một phần được đánh dấu `partialReturned`; trả toàn bộ chuyển trạng thái `returned` | M | ✅ |
| FR-RET-09 | Hoàn tiền được thực hiện qua đúng nhà cung cấp đã thu tiền (Stripe refund / VNPay refund / chuyển khoản thủ công) và ghi vào bảng `refunds` | M | ✅ |
| FR-RET-10 | Với hoàn tiền thủ công/chuyển khoản, khách cung cấp thông tin ngân hàng (`refundBankInfo`) | M | ✅ |
| FR-RET-11 | Job nền quét và đóng các yêu cầu trả hàng bị bỏ quên quá hạn (mặc định 14 ngày) | S | ✅ |
| FR-RET-12 | Bản ghi hoàn tiền lưu: loại (huỷ/trả), số tiền, lý do, trạng thái, người khởi tạo, tham chiếu yêu cầu gốc | M | ✅ |

---

## 9. Yêu cầu chức năng — Vận chuyển

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-SHP-01 | Admin quản lý danh mục phương thức vận chuyển: tên, mô tả, vùng (`all`/`domestic`/`international`), phí, ngưỡng miễn phí (`freeOver`), số ngày dự kiến, thứ tự, cờ kích hoạt | M | ✅ |
| FR-SHP-02 | Hệ thống xác định vùng vận chuyển từ quốc gia của địa chỉ: Việt Nam (hoặc trống) → `domestic`, còn lại → `international` | M | ✅ |
| FR-SHP-03 | Phí vận chuyển bằng 0 khi tổng tiền hàng đạt ngưỡng `freeOver` của phương thức đã chọn | M | ✅ |
| FR-SHP-04 | Storefront tra cứu được danh mục tỉnh / quận-huyện / phường-xã của GHN (`/api/shipping/ghn/provinces|districts|wards`) | M | ✅ |
| FR-SHP-05 | Hệ thống báo giá vận chuyển thực từ GHN theo quận/xã đích, khối lượng và kích thước gói (`POST /api/shipping/ghn/quote`, `quote-options`) | M | ✅ |
| FR-SHP-06 | Khi GHN không phục vụ khu vực đích, hệ thống trả thông báo lỗi cụ thể (`district_not_served`) thay vì lỗi chung | M | ✅ |
| FR-SHP-07 | Danh mục địa giới và dịch vụ GHN được đồng bộ định kỳ bằng job nền và có thể kích hoạt thủ công (`POST /api/admin/shipping/ghn/sync`) | S | ✅ |
| FR-SHP-08 | Admin tạo vận đơn cho đơn hàng: thủ công, qua provider chung, hoặc qua GHN (`/api/admin/orders/:orderId/shipment`, `/provider`, `/ghn`) | M | ✅ |
| FR-SHP-09 | Admin đồng bộ trạng thái vận đơn GHN theo yêu cầu (`/ghn/sync`) và GHN đẩy cập nhật qua webhook (`POST /api/webhooks/ghn`) | M | ✅ |
| FR-SHP-10 | Vận đơn lưu: nhà cung cấp, mã vận đơn, hãng vận chuyển, trạng thái, URL nhãn, chi phí, sự kiện gần nhất, URL bằng chứng giao hàng (POD), mốc gửi/dự kiến/đã giao | M | ✅ |
| FR-SHP-11 | Khách xem được thông tin vận đơn của đơn mình (`GET /api/orders/:orderId/shipment`) | M | ✅ |
| FR-SHP-12 | Hệ thống gửi email thông báo khi đơn được gửi đi | S | ✅ |
| FR-SHP-13 | Admin mô phỏng sự kiện tracking phục vụ kiểm thử (`POST .../shipment/simulate`) | C | ✅ |

---

## 10. Yêu cầu chức năng — Nội dung, Đánh giá, Tuyển dụng, AI

### 10.1 Đánh giá sản phẩm

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-REV-01 | Khách xem danh sách đánh giá của một sản phẩm (công khai, có phân trang) | M | ✅ |
| FR-REV-02 | Hệ thống kiểm tra điều kiện được đánh giá (`GET /api/products/:id/reviews/eligibility`) dựa trên lịch sử mua hàng | M | ✅ |
| FR-REV-03 | Khách đăng nhập tạo đánh giá gồm: điểm sao, tiêu đề, nội dung, biến thể liên quan | M | ✅ |
| FR-REV-04 | Đánh giá từ người đã mua được gắn nhãn `isVerifiedPurchase` | M | ✅ |
| FR-REV-05 | Khách chỉ sửa/xoá được đánh giá của chính mình | M | ✅ |
| FR-REV-06 | Admin xem toàn bộ đánh giá và xoá đánh giá vi phạm | M | ✅ |

### 10.2 Blog và trang nội dung

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CNT-01 | Storefront hiển thị danh sách bài viết đã xuất bản và chi tiết theo slug | M | ✅ |
| FR-CNT-02 | Lượt xem bài viết được ghi nhận (`articles.views`) | S | ✅ |
| FR-CNT-03 | Admin CRUD bài viết với cờ `isPublished` (bản nháp không hiển thị công khai) | M | ✅ |
| FR-CNT-04 | Trang tĩnh (chính sách, điều khoản) quản lý qua entity `pages` với slug, tiêu đề, nội dung, cờ xuất bản, ngày hiệu lực | M | ✅ |
| FR-CNT-05 | Mỗi lần sửa trang tĩnh sinh một **phiên bản mới** lưu trong `page_versions`; admin xem được lịch sử phiên bản | M | ✅ |
| FR-CNT-06 | Admin cấu hình các thiết lập site dạng khoá-giá trị (`site_settings`), hỗ trợ cập nhật hàng loạt | S | ✅ |
| FR-CNT-07 | Storefront hỗ trợ đa ngôn ngữ qua từ điển i18n và bộ chuyển ngôn ngữ | S | ✅ |

### 10.3 Tuyển dụng

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-JOB-01 | Storefront hiển thị danh sách vị trí đang mở và chi tiết vị trí | M | ✅ |
| FR-JOB-02 | Ứng viên nộp hồ sơ gồm: họ tên, email, CV (file), thư giới thiệu — **không cần tài khoản** | M | ✅ |
| FR-JOB-03 | Hệ thống chỉ nhận CV định dạng PDF hoặc Word, dung lượng ≤ 10 MB | M | ✅ |
| FR-JOB-04 | Endpoint tải CV bị giới hạn tần suất (mặc định 15 lần / 15 phút) | M | ✅ |
| FR-JOB-05 | Admin CRUD tin tuyển dụng với cờ `isOpen` | M | ✅ |
| FR-JOB-06 | Admin xem hồ sơ theo từng vị trí và cập nhật trạng thái theo luồng: `received → reviewing → interview → hired / rejected` | M | ✅ |

### 10.4 Chatbot Storefront (chỉ đọc)

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-CHAT-01 | Storefront có widget chat nổi, phản hồi được **stream** theo thời gian thực (SSE) từ `POST /api/chat` | M | ✅ |
| FR-CHAT-02 | Bot dùng ba công cụ chỉ đọc: `search_products`, `get_order_status`, `list_my_orders` | M | ✅ |
| FR-CHAT-03 | Bot **không được phép ghi vào cơ sở dữ liệu** dưới mọi hình thức | M | ✅ |
| FR-CHAT-04 | Công cụ tra cứu đơn hàng chỉ hoạt động với khách đã đăng nhập; khách vãng lai được hướng dẫn tra cứu bằng mã đơn | M | ✅ |
| FR-CHAT-05 | Bot chỉ trả lời giá và tồn kho từ dữ liệu thật lấy qua công cụ, **không được bịa** | M | ✅ |
| FR-CHAT-06 | Kết quả tìm sản phẩm được hiển thị dạng thẻ sản phẩm trong khung chat | S | ✅ |
| FR-CHAT-07 | Lịch sử hội thoại lưu trong `chat_sessions` / `chat_messages` và được nạp lại theo phiên | M | ✅ |
| FR-CHAT-08 | Endpoint chat bị giới hạn tần suất (mặc định 20 lần/phút/IP) | M | ✅ |
| FR-CHAT-09 | System prompt bật prompt caching để giảm chi phí gọi Claude API | S | ✅ |

### 10.5 Live chat với nhân viên

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-LIVE-01 | Phiên chat có 4 chế độ: `bot` → `waiting` → `live` → `closed` | M | ✅ |
| FR-LIVE-02 | Khách yêu cầu gặp nhân viên (`POST /api/chat/live/:sessionId/handoff`) kèm lý do; phiên chuyển sang `waiting` | M | ✅ |
| FR-LIVE-03 | Nhân viên xem hàng đợi phiên chờ (`GET /api/admin/inbox/queue`) và nhận phiên (`claim`); phiên chuyển sang `live` | M | ✅ |
| FR-LIVE-04 | Tin nhắn hai chiều được đẩy thời gian thực qua SSE cho cả khách và nhân viên | M | ✅ |
| FR-LIVE-05 | Nhân viên báo hiện diện bằng heartbeat và có thể chuyển sang trạng thái offline | M | ✅ |
| FR-LIVE-06 | Hệ thống theo dõi trạng thái đã đọc (`staffLastReadAt`) và cho phép đánh dấu đã đọc | S | ✅ |
| FR-LIVE-07 | Nhân viên đóng phiên; phiên chuyển sang `closed` và ghi `closedAt` | M | ✅ |
| FR-LIVE-08 | Khách vãng lai dùng được live chat qua `guestSessionId`, có thể để lại tên và email | M | ✅ |
| FR-LIVE-09 | Hộp thư live chat mở cho **mọi vai trò quản trị**, kể cả `editor` | M | ✅ |
| FR-LIVE-10 | Khi khách yêu cầu gặp nhân viên ngoài giờ trực, hệ thống gửi email cho nhân viên (kèm trích đoạn hội thoại) và email xác nhận cho khách nếu khách có để lại địa chỉ; lỗi gửi mail không được làm hỏng luồng handoff | S | ✅ |

### 10.6 Trợ lý AI Admin (có quyền ghi)

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-AI-01 | Admin dashboard có widget trợ lý AI, stream phản hồi từ `POST /api/admin/assistant` | M | ✅ |
| FR-AI-02 | Trợ lý hỗ trợ 12 công cụ: `search_products`, `get_order`, `list_orders`, `list_articles`, `create_product`, `update_product`, `create_category`, `create_discount`, `create_banner`, `update_order_status`, `publish_article`, `delete_product` | M | ✅ |
| FR-AI-03 | Hành động phá huỷ hoặc đổi trạng thái **phải được admin xác nhận** qua `POST /api/admin/assistant/confirm` trước khi thực thi | M | ✅ |
| FR-AI-04 | Trợ lý chỉ dùng được bởi vai trò `admin` và `super_admin` | M | ✅ |
| FR-AI-05 | Endpoint trợ lý bị giới hạn tần suất theo `adminId` (mặc định 30 lần/phút) | M | ✅ |
| FR-AI-06 | Mọi thao tác ghi do trợ lý thực hiện đều được ghi vào nhật ký kiểm toán với `source` phân biệt được với thao tác thủ công | M | ✅ |

### 10.7 Thông báo và nhật ký kiểm toán

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-NOTI-01 | Hệ thống tạo thông báo trong ứng dụng cho quản trị viên (đơn mới, tồn kho thấp, yêu cầu huỷ/trả...) | M | ✅ |
| FR-NOTI-02 | Thông báo có: loại người nhận, tiêu đề, nội dung, liên kết, cờ đã đọc | M | ✅ |
| FR-NOTI-03 | Người dùng và quản trị viên xem danh sách thông báo, đánh dấu đã đọc từng cái hoặc tất cả | M | ✅ |
| FR-NOTI-04 | Thông báo cho khách hàng được gửi qua **email** thay vì in-app: `notifyUser()` là no-op có chủ đích, các sự kiện dùng `queueOrderStatusEmail` / `queueCustomerNotice` | S | ✅ |
| FR-AUD-01 | Mọi thao tác **ghi** trên route `/api/admin/*` được ghi tự động vào `audit_log` | M | ✅ |
| FR-AUD-02 | Bản ghi kiểm toán lưu: loại actor, id actor, hành động, entity + id, nguồn (`ui`/`assistant`), trạng thái, metadata, thời điểm | M | ✅ |

### 10.8 Báo cáo và phân tích

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-RPT-01 | Báo cáo Top SKU bán chạy theo kỳ (mặc định 30 ngày, giới hạn 20 dòng) | M | ✅ |
| FR-RPT-02 | Báo cáo lượt xem sản phẩm | S | ✅ |
| FR-RPT-03 | Báo cáo hiệu quả chiến dịch khuyến mãi theo kỳ | S | ✅ |
| FR-RPT-04 | Báo cáo CTR của hệ gợi ý theo kỳ | S | ✅ |
| FR-RPT-05 | Dashboard hiển thị chỉ số nhanh: tổng đơn, doanh thu (đơn đã thanh toán), tổng sản phẩm, số vị trí tuyển dụng đang mở | M | ✅ |
| FR-RPT-06 | Dashboard hiển thị đơn hàng gần đây và lối tắt thao tác nhanh | S | ✅ |

### 10.9 Tải tệp

| ID | Yêu cầu | ƯT | TT |
|---|---|:--:|:--:|
| FR-UPL-01 | Admin tải ảnh sản phẩm/banner: chỉ JPEG, PNG, WebP, GIF; ≤ 5 MB mỗi tệp | M | ✅ |
| FR-UPL-02 | Ứng viên tải CV: chỉ PDF hoặc Word; ≤ 10 MB | M | ✅ |
| FR-UPL-03 | Khách tải ảnh bằng chứng trả hàng (`/api/returns`) | M | ✅ |
| FR-UPL-04 | Tệp tĩnh phục vụ qua `/public` với header `Cross-Origin-Resource-Policy: cross-origin` để frontend khác origin tải được | M | ✅ |

---

## 11. Luồng nghiệp vụ chính

### 11.1 Đặt hàng và thanh toán

```
Khách chọn biến thể → thêm vào giỏ → nhập/chọn địa chỉ
   → hệ thống báo giá GHN theo quận/xã đích
   → (tuỳ chọn) nhập mã giảm giá → validate
   → chọn phương thức thanh toán
   → POST /api/orders/checkout
        ├─ tính giá: đơn giá hiệu lực (specialPrice/campaign)
        ├─ tính subtotal − discount + shippingFee = totalAmount
        ├─ [TRANSACTION] tạo order (pending_payment) + order_items + trừ stock
        └─ lên lịch job hết hạn giữ chỗ
   → Stripe: trả clientSecret → khách thanh toán → webhook → paid
   → VNPay: redirect URL ký HMAC → IPN + verify-return → paid
   → COD: giữ pending_payment/paid theo cấu hình → thu tiền khi giao
   → xoá giỏ hàng, gửi email xác nhận, cảnh báo tồn kho thấp
```

### 11.2 Huỷ đơn

```
Khách bấm Huỷ
   → kiểm tra trạng thái ∈ {pending_payment, paid, processing}?
        ├─ Không → chặn, báo lý do
        └─ Có → có vận đơn GHN thật?
                 ├─ Không → HUỶ NGAY: [TX+LOCK] đổi cancelled, hoàn stock
                 └─ Có → tạo cancellation_request (pending)
                          → Admin duyệt → gọi GHN huỷ vận đơn
                                        → [TX+LOCK] cancelled, hoàn stock
                          → Admin từ chối → giữ nguyên đơn
   → nếu tồn tại payment succeeded → tạo refund qua đúng provider
```

### 11.3 Trả hàng lỗi

```
Đơn delivered → khách bấm Trả hàng
   → kiểm tra cửa sổ 7 ngày kể từ deliveredAt
   → chọn từng món + số lượng + tải ảnh bằng chứng (bắt buộc)
   → tạo return_request + return_request_items (pending)
   → Admin duyệt → khách gửi hàng về (returnTrackingNumber)
                 → Admin xác nhận đã nhận (receive)
                 → tính hoàn tiền: tiền hàng các món
                                   + phí ship gốc NẾU trả toàn bộ
                 → tạo refund qua provider gốc / chuyển khoản thủ công
                 → đơn: partialReturned = true, hoặc status = returned
   → Admin từ chối → đóng yêu cầu kèm lý do
   → Job nền: yêu cầu quá 14 ngày không xử lý → tự đóng
```

### 11.4 Chatbot → Live chat handoff

```
Khách mở widget → phiên mode=bot
   → hỏi đáp với Claude (tool: search_products / order status)
   → khách yêu cầu gặp người thật → mode=waiting, ghi handoffReason
   → phiên xuất hiện trong /admin/inbox/queue
   → nhân viên claim → mode=live, ghi claimedAt + assignedAdminId
   → trao đổi hai chiều qua SSE
   → nhân viên close → mode=closed, ghi closedAt
```

---

## 12. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-01 | Giá và tồn kho **luôn** thuộc về biến thể, không bao giờ thuộc về sản phẩm cha |
| BR-02 | Giỏ hàng lưu `variantId`, không lưu `productId` |
| BR-03 | Trạng thái thanh toán chỉ được xác lập bởi webhook/IPN của cổng thanh toán |
| BR-04 | Mỗi sự kiện webhook chỉ được xử lý đúng một lần (idempotency) |
| BR-05 | Tồn kho được giữ tại thời điểm tạo đơn và tự động hoàn trả nếu đơn không được thanh toán trong thời gian giữ chỗ |
| BR-06 | Trạng thái đơn không được lùi; chỉ `cancelled` là ngoại lệ |
| BR-07 | `delivered`, `cancelled`, `returned` là trạng thái kết thúc |
| BR-08 | Số tiền giảm giá không vượt quá giá trị đơn hàng |
| BR-09 | Chỉ hoàn tiền khi đã thực thu (có `payment` trạng thái `succeeded`) |
| BR-10 | Trả toàn bộ đơn → hoàn cả phí vận chuyển; trả một phần → chỉ hoàn tiền hàng |
| BR-11 | Mỗi món trả hàng bắt buộc có ít nhất một ảnh bằng chứng |
| BR-12 | Cửa sổ trả hàng: 7 ngày kể từ ngày giao thành công |
| BR-13 | Đối soát COD chỉ sau khi giao/trả hàng, chỉ một lần, và chênh lệch phải được ghi nhận |
| BR-14 | VNPay chỉ nhận VND, số tiền làm tròn bội 1.000 VND, tối thiểu 5.000 VND |
| BR-15 | Chatbot storefront tuyệt đối không ghi dữ liệu |
| BR-16 | Trợ lý AI admin phải xin xác nhận trước mọi hành động phá huỷ |
| BR-17 | Đơn hàng lưu snapshot tên/giá tại thời điểm mua để lịch sử không bị ảnh hưởng khi catalogue thay đổi |
| BR-18 | Cặp sản phẩm mua-chung chỉ tính từ đơn đã thanh toán trở lên (loại `pending_payment`, `cancelled`) |
| BR-19 | Token khách hàng và token quản trị dùng khoá ký khác nhau, không dùng lẫn |
| BR-20 | Mọi thao tác ghi của quản trị viên đều để lại vết kiểm toán |

---

## 13. Mô hình dữ liệu (tóm lược)

| Nhóm | Bảng |
|---|---|
| Người dùng | `users`, `addresses`, `email_verification_tokens`, `password_reset_tokens` |
| Quản trị | `admin_users`, `audit_log` |
| Catalogue | `products`, `product_variants`, `categories`, `tags`, `collections`, `collection_products` |
| Khuyến mãi | `discount_codes`, `campaigns`, `campaign_products`, `banners` |
| Mua sắm | `carts`, `cart_items`, `wishlists`, `wishlist_items` |
| Đơn hàng | `orders`, `order_items`, `order_shipments` |
| Huỷ/Trả | `cancellation_requests`, `return_requests`, `return_request_items` |
| Thanh toán | `payments`, `refunds`, `processed_webhook_events` |
| Vận chuyển | `shipping_methods`, `ghn_provinces`, `ghn_districts`, `ghn_wards`, `ghn_services` |
| Nội dung | `articles`, `pages`, `page_versions`, `site_settings` |
| Tuyển dụng | `jobs`, `job_applications` |
| Đánh giá | `product_reviews` |
| Gợi ý | `product_cooccurrence`, `product_view_events`, `recommendation_events` |
| Chat | `chat_sessions`, `chat_messages` |
| Thông báo | `notifications` |

---

## 14. Yêu cầu phi chức năng

### 14.1 Bảo mật

| ID | Yêu cầu |
|---|---|
| NFR-SEC-01 | Xác thực bằng JWT với access token ngắn hạn + refresh token; khoá ký riêng cho khách hàng và quản trị |
| NFR-SEC-02 | Hỗ trợ thu hồi token: denylist theo `jti` và mốc thu hồi theo tài khoản |
| NFR-SEC-03 | Mọi input được kiểm tra bằng Zod ở tầng middleware, không kiểm tra trong controller/service |
| NFR-SEC-04 | Áp dụng `helmet` cho HTTP security headers; session cookie `httpOnly`, `sameSite=strict`, `secure` ở production |
| NFR-SEC-05 | Rate limiting: auth 20/15 phút, chat 20/phút, trợ lý AI 30/phút/admin, upload 15/15 phút |
| NFR-SEC-06 | Chữ ký webhook Stripe và VNPay bắt buộc được xác thực trước khi xử lý |
| NFR-SEC-07 | Kiểm soát truy cập theo vai trò ở tầng route (`requireRole`) |
| NFR-SEC-08 | Không truy cập `process.env` trực tiếp; mọi biến môi trường đi qua `config/env.ts` |

### 14.2 Hiệu năng và độ tin cậy

| ID | Yêu cầu |
|---|---|
| NFR-PER-01 | Cache Redis cho các endpoint GET dữ liệu ổn định với TTL 5/10/30/60 phút; vô hiệu cache khi dữ liệu thay đổi |
| NFR-PER-02 | Công việc chậm (email, đồng bộ GHN, dựng bảng gợi ý) chạy bất đồng bộ qua BullMQ, không chặn request |
| NFR-PER-03 | Các thao tác đổi trạng thái tiền/tồn kho dùng transaction + khoá dòng để an toàn khi đồng thời |
| NFR-PER-04 | Job hàng đợi có retry với backoff luỹ thừa (3 lần, delay khởi điểm 5s) |
| NFR-PER-05 | Endpoint `/api/health` kiểm tra tình trạng dịch vụ phục vụ giám sát/deploy |

### 14.3 Khả năng bảo trì

| ID | Yêu cầu |
|---|---|
| NFR-MNT-01 | Mỗi module backend tuân thủ cấu trúc 6 tệp: entity / interface / validate / service / controller / route |
| NFR-MNT-02 | Service không import kiểu dữ liệu của Express; controller không chứa logic nghiệp vụ |
| NFR-MNT-03 | Mọi response đi qua `sendSuccess()` / `sendError()`, không gọi `res.json()` trực tiếp |
| NFR-MNT-04 | Lỗi nghiệp vụ ném `AppError` và được xử lý tập trung tại `error-handler` |
| NFR-MNT-05 | Mọi thay đổi lược đồ CSDL phải có migration Sequelize; cấm `sync({force})`/`alter` ở production |
| NFR-MNT-06 | TypeScript strict mode; không dùng `any` |
| NFR-MNT-07 | Logic nghiệp vụ thuần (giá, chuyển trạng thái, huỷ, trả, đối soát) được tách thành hàm thuần để kiểm thử bằng Vitest |
| NFR-MNT-08 | Log request có cấu trúc JSON ở production |

### 14.4 Trải nghiệm & bản địa hoá

| ID | Yêu cầu |
|---|---|
| NFR-UX-01 | Nhận diện thị giác "warm/artisan": tông đất, cảm giác thủ công — là yêu cầu sản phẩm, không chỉ là thẩm mỹ |
| NFR-UX-02 | Ưu tiên thị trường Việt Nam: mô hình địa chỉ phường/quận/tỉnh, múi giờ Asia/Ho_Chi_Minh |
| NFR-UX-03 | Storefront hỗ trợ đa ngôn ngữ qua từ điển i18n |
| NFR-UX-04 | Có cờ tính năng (`lib/features.ts`) để bật/tắt nhanh các nhóm chức năng: collections, blog, careers, wishlist, chat, campaigns, banners, articles, jobs |

---

## 15. Phát hiện khác biệt & vấn đề cần quyết định

Các điểm sau là **mâu thuẫn giữa tài liệu và mã nguồn**, hoặc khoảng trống chức năng, cần Product Owner quyết định.

| Mã | Nội dung | Ảnh hưởng | Đề xuất |
|---|---|---|---|
| D1 | `code/CLAUDE.md` ghi *"Stripe only — no COD"* và *"không tạo đơn cho tới khi Stripe xác nhận"*. Mã nguồn thực tế hỗ trợ **stripe, vnpay, cod** và tạo đơn ở `pending_payment` **trước** khi thanh toán | Cao — hướng dẫn kiến trúc sai lệch, dễ dẫn đến sửa nhầm | Cập nhật `CLAUDE.md` theo mô hình 3 phương thức + giữ chỗ tồn kho |
| D2 | Tài liệu cũ mô tả "chỉ khách đăng nhập mới được mua"; mã nguồn hỗ trợ đầy đủ **guest checkout** với `guestToken` | Trung bình — ảnh hưởng UAT và chính sách CSKH | Xác nhận guest checkout là chức năng chính thức, bổ sung kịch bản UAT |
| D3 | Khách hàng **không có thông báo in-app**: `notifyUser()` là no-op có chủ đích, mọi sự kiện gửi qua email. Endpoint `/api/notifications` cho khách vẫn tồn tại nhưng luôn trả danh sách rỗng | Thấp–Trung bình | Xác nhận đây là quyết định chính thức; nếu đúng, gỡ endpoint thông báo phía khách hoặc ghi rõ trong tài liệu API |
| D4 | Vai trò `editor` chỉ được cấp quyền collections, đối soát COD và live chat — **không có quyền nội dung** như tài liệu mô tả | Trung bình — phân quyền vận hành không khớp kỳ vọng | Làm rõ định nghĩa vai trò `editor`, cấp quyền bài viết/banner nếu đúng ý định |
| D5 | Tồn tại các thư mục module rỗng: `admin/`, `coupon/`, `product-option/`, `role/` | Thấp — gây hiểu nhầm về phạm vi | Xoá hoặc ghi rõ là dự phòng cho giai đoạn sau |
| D6 | Cửa sổ trả hàng là 7 ngày (hằng số cứng `RETURN_WINDOW_DAYS`), trong khi job quét quá hạn dùng 14 ngày (`RETURN_EXPIRY_DAYS`) — hai con số khác nhau, dễ nhầm | Thấp | Đưa cả hai vào cấu hình và ghi rõ ý nghĩa khác nhau trong tài liệu chính sách |
| D7 | Chưa thấy chức năng hợp nhất giỏ hàng của khách vãng lai vào giỏ khách khi đăng nhập | Trung bình — mất giỏ hàng làm giảm chuyển đổi | Bổ sung yêu cầu hợp nhất giỏ khi đăng nhập |
| D8 | Có email fallback ngoài giờ cho live chat nhưng **chưa có SLA thời gian phản hồi** và chưa có cảnh báo khi phiên chờ quá lâu trong giờ trực | Thấp | Định nghĩa SLA phản hồi và bổ sung cảnh báo theo ngưỡng thời gian chờ |
| D9 | Không có kiểm thử tự động ở tầng frontend; backend có Vitest nhưng độ phủ chưa đo | Trung bình | Đặt mục tiêu độ phủ cho logic nghiệp vụ thuần |

---

## 16. Ma trận truy vết (trích yếu)

| Nhóm FR | Endpoint chính | Màn hình chính |
|---|---|---|
| FR-AUTH | `/api/auth/*` | `(auth)/login`, `(auth)/register`, `(auth)/auth/*` |
| FR-USR, FR-ADR | `/api/users/*`, `/api/addresses` | `account/profile`, `account/password`, `account/addresses` |
| FR-CAT, FR-SRCH | `/api/products`, `/api/categories`, `/api/collections`, `/api/tags` | `products`, `products/[slug]`, `collections` |
| FR-CART, FR-WISH | `/api/cart/*`, `/api/wishlist/*` | `cart`, `wishlist`, `account/favorites` |
| FR-DISC | `/api/discounts/validate`, `/api/admin/campaigns` | `checkout`, `admin/discounts`, `admin/campaigns` |
| FR-CHK, FR-PAY | `/api/orders/checkout`, `/api/webhooks/*`, `/api/admin/cod` | `checkout`, `checkout/vnpay-return`, `orders/thank-you`, `admin/cod` |
| FR-ORD, FR-CAN, FR-RET | `/api/orders/*`, `/api/admin/orders/*` | `orders`, `orders/[id]`, `account/orders`, `admin/orders` |
| FR-SHP | `/api/shipping/ghn/*`, `/api/admin/orders/:id/shipment` | `checkout`, `admin/orders/[id]`, `admin/shipping-methods` |
| FR-REV | `/api/products/:id/reviews` | `products/[slug]`, `admin/reviews` |
| FR-CNT | `/api/articles`, `/api/pages`, `/api/banners`, `/api/settings` | `blog`, `policies`, `terms`, `admin/articles`, `admin/pages`, `admin/banners`, `admin/settings` |
| FR-JOB | `/api/jobs`, `/api/jobs/:id/applications` | `careers`, `careers/[id]`, `admin/jobs` |
| FR-CHAT, FR-LIVE | `/api/chat`, `/api/chat/live/*`, `/api/admin/inbox/*` | `ChatWidget`, `admin/inbox` |
| FR-AI | `/api/admin/assistant` | `AssistantWidget` |
| FR-RPT | `/api/admin/reports/*` | `admin/dashboard`, `admin/reports` |
| FR-ADM, FR-AUD | `/api/admin/auth`, `/api/admin/users` | `admin/login`, `admin/users` |

---

*Hết tài liệu.*
