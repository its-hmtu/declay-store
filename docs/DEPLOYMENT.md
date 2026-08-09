# Triển khai môi trường Test (Staging)

**Mục tiêu:** có một URL **HTTPS công khai** để (a) chạy thử toàn hệ thống, (b) **đăng ký sandbox VNPay** — VNPay bắt buộc khai báo Return URL + IPN URL công khai.

---

## 1. Chọn nền tảng (khuyến nghị)

| Phương án | Ưu | Nhược | Hợp khi |
|---|---|---|---|
| **Railway / Render (khuyến nghị cho staging)** | Có sẵn Postgres + Redis quản lý, tự cấp domain **HTTPS**, deploy từ Dockerfile hoặc repo, ít việc vận hành | Chi phí theo mức dùng; ít quyền kiểm soát hạ tầng | Cần có URL https nhanh để đăng ký VNPay |
| **VPS + Docker Compose** | Rẻ nhất khi chạy lâu dài, toàn quyền | Phải tự lo Nginx + SSL (Caddy/certbot), backup | Đã quen quản trị server |
| **Vercel (FE) + Render (API)** | FE Next.js tối ưu sẵn | Tách 2 nơi, cấu hình CORS/URL phức tạp hơn | Ưu tiên hiệu năng FE |

> **Lưu ý kiến trúc:** API dùng **BullMQ + Redis** với worker chạy nền → **không** deploy API lên serverless (Vercel Functions). API cần môi trường chạy liên tục (container/VM).

**Khuyến nghị:** dùng **Railway** hoặc **Render** cho cả 4 thành phần (API, Web, Postgres, Redis) ở giai đoạn staging. Khi ổn định có thể chuyển sang VPS để tiết kiệm.

---

## 2. Thành phần cần chạy
- **web-api** (Node 20, Express) — port 3000
- **web-fe** (Next.js) — port 3000
- **PostgreSQL 15**
- **Redis 7**
- **Cloudinary** (dịch vụ ngoài — chỉ cần key)

---

## 3. Biến môi trường

### Backend (`web-api`)
| Biến | Bắt buộc | Ghi chú |
|---|:--:|---|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | mặc định 3000 |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | ✅ | Postgres |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | ✅ | Redis (BullMQ + cache) |
| `APP_PUBLIC_URL` | ✅ | URL công khai của API (dùng dựng link file khi fallback đĩa) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | `openssl rand -base64 48` |
| `CLOUDINARY_URL` | ✅ | `cloudinary://key:secret@cloud_name` |
| `PAYMENTS_DOMESTIC` | ➖ | MVP: `cod` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ➖ | chỉ khi bật thẻ quốc tế |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | ✅ (khi bật VNPay) | lấy trong email VNPay sandbox |
| `VNPAY_PAY_URL` | ➖ | mặc định sandbox `.../paymentv2/vpcpay.html` |
| `VNPAY_RETURN_URL` | ✅ (khi bật VNPay) | `https://<web>/checkout/vnpay-return` — phải **trùng** URL đã khai báo với VNPay |
| `VNPAY_USD_TO_VND` | ✅ (khi bật VNPay) | **Tỉ giá USD→VND, vd `26000`.** Không có mặc định — thiếu hoặc `< 1000` thì API trả 503 và FE ẩn lựa chọn VNPay, thay vì thu sai tiền |
| `ANTHROPIC_API_KEY` | ➖ | chỉ khi bật chatbot/AI (Phase A) |
| `LOW_STOCK_THRESHOLD`, `RESERVATION_TTL_MS` | ➖ | có mặc định |

### Frontend (`web-fe`) — **phải có lúc BUILD** (Next inline biến `NEXT_PUBLIC_*`)
| Biến | Bắt buộc | Ghi chú |
|---|:--:|---|
| `NEXT_PUBLIC_API_URL` | ✅ | ví dụ `https://api.staging.example.com/api` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | dùng cho **OG/share** — sai thì ảnh chia sẻ hỏng |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ➖ | chỉ khi bật thẻ |

---

## 4. Cách deploy

### 4.1. Railway / Render (từ Dockerfile)
1. Tạo **Postgres** và **Redis** (managed) → lấy connection info.
2. Tạo service **API**: trỏ tới `code/web-api` (đã có `Dockerfile`), điền env ở §3. Health check: `GET /api/health`.
3. Tạo service **Web**: trỏ tới `code/web-fe` (`Dockerfile`), khai báo **build args** `NEXT_PUBLIC_*`.
4. Migration chạy **tự động** khi khởi động (`prestart` → `node scripts/migrate.js up`).
5. Ghi lại 2 domain https → dùng cho VNPay ở §6.

---

## 4b. Hướng dẫn chi tiết cho **Render** (đã chọn)

Repo đã có sẵn **`render.yaml`** (Blueprint) khai báo đủ 4 thành phần: Postgres, Key Value (Redis), API, Web.

### Bước 1 — Đẩy code lên Git
Render deploy từ GitHub/GitLab. Đảm bảo nhánh làm việc (`feature/mvp-cod-checkout`) đã được push.

### Bước 2 — Tạo Blueprint
Render Dashboard → **New +** → **Blueprint** → chọn repo → Render đọc `render.yaml` → **Apply**.
Render sẽ tạo: `declay-db` (Postgres), `declay-redis` (Key Value), `declay-api`, `declay-web`.

### Bước 3 — Điền các biến `sync: false`
Sau lần tạo đầu, vào từng service → **Environment**:

**declay-api**
| Biến | Giá trị |
|---|---|
| `APP_PUBLIC_URL` | `https://declay-api.onrender.com` (URL Render vừa cấp) |
| `CLOUDINARY_URL` | `cloudinary://<key>:<secret>@<cloud_name>` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | để trống nếu chỉ dùng COD |
| `ANTHROPIC_API_KEY` | để trống (chatbot chưa bật) |

**declay-web**
| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://declay-api.onrender.com/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://declay-web.onrender.com` |

> ⚠️ **Bắt buộc:** sau khi điền `NEXT_PUBLIC_*`, vào **declay-web** → **Manual Deploy** → **Clear build cache & deploy**. Next.js "nướng" các biến này vào bundle **lúc build**, không đọc lúc chạy.

### Bước 4 — Migration
Chạy **tự động** khi API khởi động (`prestart` → `node scripts/migrate.js up`).
Xem log `declay-api` để xác nhận đã chạy tới **019**. Nếu lỗi, mở **Shell** của service và chạy tay:
```bash
node scripts/migrate.js status
node scripts/migrate.js up
```

### Bước 5 — Tạo tài khoản admin
Dùng **Shell** của `declay-api`:
```bash
node seeders/seed.js      # hoặc script tạo admin của dự án
```

### Bước 6 — Smoke test
Chạy theo checklist §5.

---

### ⚠️ Hạn chế của gói Free trên Render (cần biết trước)

| Vấn đề | Ảnh hưởng | Cách xử lý |
|---|---|---|
| **Web service Free ngủ sau ~15 phút không có traffic** | Request đầu tiên chậm ~30–60s. **BullMQ worker cũng ngừng** → job hẹn giờ (nhả giữ chỗ tồn kho, gửi email) **không chạy đúng hạn** | Chấp nhận khi test thủ công. Khi tích hợp **VNPay (IPN webhook)** nên nâng `declay-api` lên gói trả phí — cổng thanh toán gọi webhook vào service đang ngủ dễ **timeout** |
| **Postgres Free có hạn sử dụng** | Sau thời hạn DB bị xoá | Không để dữ liệu quan trọng; nâng gói khi chạy thật |
| **Ổ đĩa không bền (ephemeral)** | File upload ghi vào đĩa sẽ mất khi deploy lại | **Đã xử lý**: ảnh lưu trên **Cloudinary**, chỉ cần đặt `CLOUDINARY_URL` |
| API và Web khác domain | Gọi API xuyên origin | **Đã xử lý**: API bật `cors()` cho mọi origin |

### Khi đăng ký VNPay sandbox, khai báo:
- **Return URL:** `https://declay-web.onrender.com/checkout/vnpay-return`
- **IPN URL:** `https://declay-api.onrender.com/api/webhooks/vnpay`

(Hai endpoint này **đã cài đặt xong** ở M-12. Sau khi điền `VNPAY_*` vào Render và deploy lại, có thể test ngay bằng thẻ sandbox NCB.)

### 4.2. VPS + Docker Compose
```bash
cp code/.env.staging.example code/.env      # rồi điền giá trị thật
cd code
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml logs -f api
```
Sau đó đặt **Caddy/Nginx** phía trước để cấp HTTPS cho 2 domain (web → :3000, api → :3001).

---

## 5. Kiểm tra sau khi deploy (smoke test)
1. `GET https://<api>/api/health` → 200.
2. Mở web: đổi **VI/EN**, xem danh sách sản phẩm.
3. Admin: đăng nhập, tạo 1 sản phẩm + biến thể (nhớ **cân nặng**), upload ảnh → URL phải là `res.cloudinary.com`.
4. Khách **không đăng nhập**: thêm giỏ → checkout **COD** → nhận trang Cảm ơn.
5. Admin: đơn hiện ở `processing` → nhập mã vận đơn (`shipped`) → `delivered`.
6. Trang **COD cash**: đơn xuất hiện → đối soát tiền.
7. Trang **Reports**: thấy SKU vừa bán.
8. Kiểm tra link chia sẻ sản phẩm (Facebook Sharing Debugger) → hiện ảnh + tên + giá.

---

## 6. Chuẩn bị cho VNPay sandbox
Khi đăng ký, VNPay yêu cầu:
- **Return URL**: `https://<web>/checkout/vnpay-return`
- **IPN URL**: `https://<api>/api/webhooks/vnpay`

**Trạng thái: đã cài đặt (M-12).**

Quy tắc bảo mật đã áp dụng:
- Chữ ký **HMAC-SHA512** trên chuỗi tham số đã sắp xếp theo alphabet, encode `%20` → `+`; sai chữ ký → trả `RspCode 97`.
- **IPN là nguồn sự thật**, không phải Return URL. Trang `/checkout/vnpay-return` chỉ hiển thị, có gọi API xác minh lại chữ ký.
- **Đối chiếu số tiền** trước khi ghi nhận (`vnp_Amount` phải khớp `totalAmount × 100`), lệch → `RspCode 04`.
- **Idempotent**: đơn không còn ở `pending_payment` → `RspCode 02`, không lặp side-effect (VNPay retry nhiều lần).
- `vnp_TxnRef = <orderId>-<timestamp>` để mỗi lần thanh toán lại là một mã giao dịch mới (VNPay không cho trùng `TxnRef`).

### Đơn treo ở `pending_payment` sau khi đã thanh toán

**Nguyên nhân gốc**: ban đầu chỉ IPN mới ghi nhận thanh toán. IPN là lời gọi server-to-server từ VNPay — nếu nó không tới được máy chủ thì đơn treo mãi dù khách đã trả tiền.

**Đã sửa**: luật ghi nhận nằm ở `vnpay.settlement.ts` (11 unit test) và được dùng bởi **cả hai** lối vào:

| Lối vào | Vai trò |
|---|---|
| `GET/POST /api/webhooks/vnpay` (IPN) | Lối chính, không phụ thuộc trình duyệt khách |
| `GET /api/webhooks/vnpay/verify-return` (trang return) | **Lưới an toàn** — khách quay lại là đơn được ghi nhận, kể cả khi IPN chưa tới |

Cả hai đều kiểm lại chữ ký phía server và đối chiếu số tiền với bản chốt, nên khách **không thể** tự tạo kết quả "thành công". Ghi nhận idempotent — lối nào tới trước cũng cho cùng kết quả.

**Khi vẫn gặp đơn treo, chạy:**
```bash
node scripts/vnpay-diagnose.js          # liệt kê mọi đơn VNPay đang treo
node scripts/vnpay-diagnose.js 42       # soi một đơn cụ thể
```
Script chỉ ra đúng điểm dừng: thiếu bản chốt số tiền / chưa hề nhận callback / callback bị từ chối.

**Danh sách kiểm tra khi chưa hề nhận được callback:**

1. IPN URL đã khai báo trên cổng merchant chưa (`https://<api>/api/webhooks/vnpay`) — sandbox bắt buộc khai báo trong phần Cấu hình, **không** tự suy ra từ Return URL.
2. Máy chủ có truy cập được từ Internet không (localhost thì VNPay không gọi tới được).
3. Dịch vụ có đang ngủ không — **gói Free của Render ngủ sau ~15 phút**, IPN sẽ timeout. Đây là lý do nên nâng gói cho `declay-api`.
4. Xem log `VNPay settlement decision` trên dashboard: có `source`, `rspCode`, `action`, `snapshotAmount` — đủ để biết vì sao bị từ chối.

---

### M-15: hệ thống niêm yết bằng VND

Từ migration `021`, toàn bộ giá sản phẩm, đơn hàng, mã giảm giá và phí ship đều tính bằng **VND**. Lớp quy đổi tiền tệ của VNPay đã bị **xoá bỏ** — không còn tỉ giá nào để cấu hình sai.

```bash
VND_MIGRATION_RATE=26000 npm run migrate   # tỉ giá chỉ dùng MỘT LẦN để đổi dữ liệu cũ
```

Quy tắc trong migration: làm tròn 1.000đ gần nhất; **không** nhân tỉ giá vào mã giảm giá kiểu `percent` (nếu không sẽ thành mã giảm 2.600.000%); nới kiểu cột lên `NUMERIC(14,2)` vì `NUMERIC(10,2)` chỉ chứa được tới ~99,9 triệu đồng.

> ⚠️ Migration này **không rollback tự động** — nhân/chia hai chiều làm mất số lẻ gốc. Sao lưu database trước khi chạy.

---

### M-19b: xung đột sổ địa chỉ ↔ checkout (đã sửa)

**Lỗi**: thành viên có địa chỉ mặc định đã chọn nhưng **không thanh toán được** — nút bị khoá.

**Nguyên nhân**: sổ địa chỉ dùng ô nhập text tự do (`ward`/`district`/`city`), chưa từng lưu mã địa giới GHN. Checkout cần `ghn_district_id` + `ghn_ward_code` để hỏi phí; địa chỉ đã lưu không có → không báo được phí → `canOrder` mãi là false.

**Đã sửa toàn chuỗi**:

- Form địa chỉ trong Tài khoản nay dùng **dropdown GHN** (Tỉnh → Quận → Phường), lưu kèm mã.
- Backend `addresses` nhận và trả `ghnProvinceId`/`ghnDistrictId`/`ghnWardCode` (validate + controller + entity).
- Checkout: thành viên chọn địa chỉ đã lưu → tự lấy mã GHN từ địa chỉ đó để hỏi phí.
- Địa chỉ **cũ** (tạo trước tích hợp, mã GHN null): hiện cảnh báo rõ *"Địa chỉ này chưa có mã địa giới GHN, vui lòng cập nhật"* thay vì khoá câm nút thanh toán.

Ranh giới "địa chỉ giao được / cần cập nhật" nằm ở hàm thuần `address.ghn.ts` (6 test).

> ⚠️ Địa chỉ đã lưu **trước** bản sửa này cần khách vào Tài khoản mở ra chọn lại Tỉnh/Quận/Phường một lần. Không có migration tự động vì text tự do (`"Quận 1"`, `"Q.1"`) không tra ngược an toàn ra mã GHN — đoán sai là hàng đi nhầm nơi.

---

### M-17: email xác nhận cho khách vãng lai

**Lỗi đã sửa**: worker email lấy địa chỉ từ `order.user.email`. Đơn khách vãng lai không có bản ghi `user`, nên điều kiện `if (!order || !userEmail) return;` khiến **mọi email đơn hàng của khách vãng lai bị bỏ qua âm thầm** — không log, không lỗi. Nay có fallback sang `order.guest_email` và ghi cảnh báo khi không tìm được người nhận.

Email xác nhận (`order-confirmation`) gửi khi:

| Phương thức | Thời điểm |
|---|---|
| COD | Ngay khi đặt hàng (không có bước thanh toán) |
| VNPay | Sau khi ghi nhận thanh toán (`markVnpayPaid`) |
| Thẻ quốc tế | Sau khi webhook Stripe xác nhận |

Nội dung dựng bởi `order-email.ts` (14 test): đầy đủ từng sản phẩm, biến thể, đơn giá × số lượng, thành tiền, tạm tính, giảm giá, phí ship, tổng cộng, địa chỉ giao, và link tra cứu bằng `guest_token`. Tên sản phẩm và tên khách đều được escape — chặn HTML injection qua email.

Với khách vãng lai đây là **hoá đơn duy nhất**: không có tài khoản thì không có trang lịch sử đơn.

**Trang cảm ơn VNPay** giờ hiện đầy đủ nội dung đơn + mã vận đơn, và **ẩn nút "Xem đơn hàng"** với khách vãng lai — họ không mở được `/orders/:id`, nút đó chỉ dẫn tới trang lỗi. Nội dung đơn chỉ được trả về khi chữ ký VNPay hợp lệ **và** đơn đã thanh toán.

### M-18: email thứ hai — báo mã vận đơn

Vận đơn chỉ tồn tại sau khi admin xác nhận đơn, nên email xác nhận đầu tiên **không thể** chứa mã vận đơn. Email thứ hai (`order-shipped`) lấp khoảng trống đó.

| Kích hoạt khi | Đường đi |
|---|---|
| Admin tạo vận đơn GHN | `POST /admin/orders/:id/shipment/ghn` |
| Admin nhập mã vận đơn thủ công | `POST /admin/orders/:id/shipment` |

Cả hai lối vào đều gửi — nếu chỉ nối một lối, việc khách có nhận được email hay không sẽ tuỳ thuộc admin thao tác kiểu nào.

Nội dung (`buildShipmentNotificationHtml`, 13 test): mã vận đơn nổi bật, nút theo dõi trên `donhang.ghn.vn`, ngày dự kiến giao theo giờ Việt Nam, danh sách sản phẩm để đối chiếu khi mở kiện, địa chỉ giao, và **số tiền mặt cần chuẩn bị**:

- Đơn COD → hiện rõ số tiền shipper sẽ thu.
- Đơn đã thanh toán → khẳng định *không phải trả thêm*, tránh việc khách bị thu nhầm lần hai.

Email đưa vào **hàng đợi** chứ không gửi trực tiếp: SMTP hỏng không được phép làm hỏng một vận đơn đã tạo thành công bên GHN.

---

### M-16: mã đơn hàng & M-13d: mã vận đơn

Giao diện **không còn hiển thị id cơ sở dữ liệu**. Mỗi đơn có mã riêng dạng `DC-YYMMDD-XXXX`:

- Bảng chữ cái bỏ `I L O U 0 1` — những ký tự dễ đọc nhầm khi in trên nhãn hoặc đọc qua điện thoại.
- Ngày theo giờ Việt Nam, không theo UTC.
- Migration `024` cấp mã cho toàn bộ đơn cũ, có ràng buộc `UNIQUE`.
- Khách gõ liền không dấu gạch (`dc2607261a2b`) vẫn tra được nhờ `normalizeOrderCode`.

Lý do bỏ id: id tuần tự cho biết cửa hàng có bao nhiêu đơn — đối thủ chỉ cần đặt hai đơn cách nhau vài ngày là đếm được sản lượng.

**Vận đơn GHN** được tạo khi **admin xác nhận đơn**, không phải lúc khách đặt — đơn ảo, đơn hết hàng, đơn khách huỷ vì thế không phát sinh cước.

```
POST /api/admin/orders/:orderId/shipment/ghn
```

Ba luật tiền đã cài trong `ghn.order.ts` (18 test):

| Trường | Luật | Hậu quả nếu sai |
|---|---|---|
| `payment_type_id` | Luôn `1` (cửa hàng trả cước) | Đặt `2` là shipper thu thêm phí ship của khách lần nữa |
| `cod_amount` | Đơn trả trước ⇒ `0` | Để nguyên tổng đơn là **thu tiền khách hai lần** |
| `client_order_code` | Bằng mã đơn hàng | GHN trả lại vận đơn cũ khi gọi lại ⇒ admin bấm hai lần không sinh hai vận đơn |

GHN dùng chính `order_code` làm mã tra cứu, nên nó vừa là `provider_shipment_id` vừa là `tracking_number`. Khách thấy mã kèm nút sao chép và link tra cứu `donhang.ghn.vn`.

⚠️ Tạo vận đơn là **thao tác ghi** — bị chặn cho tới khi đặt `GHN_ALLOW_WRITE=true`. Ở chế độ `readonly` hệ thống trả lỗi 403 kèm lời nhắc.

---

### M-25: refresh token cho admin

**Lỗi**: admin login chỉ cấp access token 8h, không có refresh. Hết hạn là bị đăng xuất giữa chừng — và cookie access cũng 8h, nên khi tải lại trang, layout đá thẳng về login.

**Đã sửa**:

- Login admin nay trả **access + refresh** (`POST /admin/auth/login`).
- `POST /admin/auth/refresh` đổi refresh lấy access mới (kiểm tra admin còn active), có xoay refresh.
- api client: 401 trên path `/admin` → **tự gia hạn** bằng refresh rồi thử lại request, thay vì xoá token. Loại trừ `/admin/auth/*` để không lặp vô hạn.
- Layout admin: khi tải trang mà access đã hết hạn nhưng còn refresh → gia hạn ngay, chỉ về login khi refresh cũng hỏng.

Token: access 8h, refresh 30 ngày. Secret riêng `JWT_ADMIN_REFRESH_SECRET` (bảo mật: refresh sign bằng secret khác access nên không thể dùng token này thay token kia; đã có test khẳng định). Trên Render cả hai `JWT_ADMIN_SECRET` và `JWT_ADMIN_REFRESH_SECRET` để `generateValue: true`.

---

### M-24: cập nhật trạng thái đơn từ GHN

Sau khi có mã vận đơn, trạng thái đơn được cập nhật **tự động** từ GHN qua webhook.

**Đăng ký webhook với GHN** (một lần): gửi cho GHN (email api@ghn.vn hoặc trong dashboard) — ClientID, môi trường (staging/production), và URL:

```
https://<api-domain>/api/webhooks/ghn
```

Mỗi khi vận đơn đổi trạng thái, GHN POST về URL này. Ánh xạ (`ghn.status.ts`, 9 test):

| GHN status | Trạng thái đơn |
|---|---|
| ready_to_pick, picking, picked, storing, transporting, sorting, delivering | `shipped` |
| delivered | `delivered` (gửi email + đặt `deliveredAt`, mở cửa sổ đổi trả 7 ngày) |
| returned / return* | `returned` |
| cancel | `cancelled` |
| delivery_fail, exception, damage, lost | *giữ nguyên* — cần người xử lý |

Nguyên tắc an toàn:

- **Tiến-một-chiều**: webhook đến trễ/sai thứ tự không kéo lùi đơn đã `delivered`. `"delivering"` (đang giao) được map riêng, **không** nhầm thành `"delivered"`.
- **Luôn trả `code:200`** — kể cả khi không khớp vận đơn hoặc xử lý lỗi — vì GHN retry 10 lần nếu nhận mã khác 200, chỉ làm dội request.
- Không có chữ ký (GHN không cung cấp): lớp bảo vệ là khớp theo `OrderCode` (mã GHN cấp, khó đoán) đã tồn tại trong DB + forward-only.

**M-26: nút "Đồng bộ từ GHN" (polling)** — trên admin order detail, khi đơn có vận đơn GHN. Bấm một cái gọi Order Info (`/v2/shipping-order/detail`, chỉ đọc, không tốn cước), lấy `status` hiện tại rồi áp qua **đúng mapper webhook** (forward-only). Dùng khi webhook bị miss (server ngủ / chưa đăng ký URL).

> ⚠️ **Gói Free của Render ngủ sau ~15 phút** — webhook gọi vào service đang ngủ có thể timeout và GHN chỉ retry 10 lần. Để cập nhật đáng tin, nâng `declay-api` lên gói trả phí, hoặc dùng nút "Đồng bộ từ GHN" thủ công (polling) trên trang admin khi cần.

**M-27: job đồng bộ GHN tự động (polling nền)** — phiên bản tự động của nút M-26. Một BullMQ repeatable job (`ghn-sync`) chạy mỗi `GHN_SYNC_INTERVAL_MS` (mặc định 15 phút), quét các vận đơn `provider = 'ghn'` **chưa ở trạng thái cuối** (delivered/returned/cancelled) và kéo trạng thái mới nhất từ GHN, áp qua **đúng mapper webhook** (forward-only). Đây là lưới an toàn thứ hai khi webhook bị miss mà admin không phải bấm tay.

- **An toàn dev:** ở chế độ `mock` job **tự bỏ qua** (getOrderStatus giả luôn trả `delivered` sẽ đánh dấu nhầm mọi đơn). Chỉ chạy khi có `GHN_TOKEN` thật.
- **Chống nghẽn:** mỗi lượt xử lý tối đa `GHN_SYNC_BATCH_SIZE` đơn (mặc định 50), ưu tiên đơn lâu chưa cập nhật; một đơn lỗi không làm hỏng cả lượt.
- **Chỉ đọc, không tốn cước** (Order Info). Bật/tắt bằng `GHN_SYNC_ENABLED`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `GHN_SYNC_ENABLED` | bật khi có `GHN_TOKEN` | `false` để tắt hẳn job |
| `GHN_SYNC_INTERVAL_MS` | `900000` (15 phút) | nhịp quét |
| `GHN_SYNC_BATCH_SIZE` | `50` | số vận đơn mỗi lượt |

> Ba tầng cập nhật trạng thái, từ nhanh nhất tới chậm nhất: **webhook (M-24)** tức thời → **job nền (M-27)** mỗi 15 phút → **nút thủ công (M-26)** khi admin cần ngay. Ba tầng dùng chung một mapper forward-only nên không bao giờ mâu thuẫn.

---

### M-22: nhiều phương thức GHN (nhanh/chuẩn/tiết kiệm)

Checkout hiển thị **tất cả dịch vụ** GHN có cho tuyến, mỗi cái kèm phí và thời gian giao dự kiến; khách chọn một.

| Thành phần | Vai trò |
|---|---|
| `POST /shipping/ghn/quote-options` | Trả mảng dịch vụ cho giỏ hiện tại |
| `ghn.service.quoteOptions()` | Mỗi dịch vụ khả dụng gọi `fee` + `leadtime` SONG SONG; dịch vụ nào lỗi thì bỏ qua, không làm hỏng danh sách |
| `ghn.services-meta.ts` | Gán tên tiếng Việt + thứ tự (nhanh trước, tiết kiệm sau) + quy số ngày giao — hàm thuần, 7 test |

Khách chọn dịch vụ nào thì `ghnServiceId` được gửi khi đặt đơn; server tính phí **đúng dịch vụ đó** (không tự đoán) và lưu `ghn_service_id` để lúc tạo vận đơn dùng đúng nó. Endpoint dùng `/leadtime` (`POST /v2/shipping-order/leadtime`) cho thời gian giao.

Số ngày giao lấy từ `leadtime − order_date`, làm tròn lên; nếu GHN không trả leadtime thì ẩn dòng đó thay vì hiện sai.

---

### M-13: vận chuyển GHN

GHN có hai môi trường, mỗi môi trường một base URL và một loại token riêng:

| Môi trường | Base URL | Đăng ký token tại |
|---|---|---|
| Staging (test) | `https://dev-online-gateway.ghn.vn` | `5sao.ghn.dev` |
| Production | `https://online-gateway.ghn.vn` | `khachhang.ghn.vn` |

Ở **staging**, `create` không tạo vận đơn thật và không tính cước thật — đây là nơi test lý tưởng. Token phải khớp môi trường: token staging chỉ chạy với dev URL, token production chỉ chạy với online URL; lệch nhau sẽ trả 401/403.

Hai lớp an toàn độc lập với nhau:
1. **Chọn đúng môi trường** — dùng staging thì tạo vận đơn thoải mái, không mất tiền.
2. **`GHN_MODE`** — với token production trên gateway thật, `preview` cho phép kiểm chứng vận đơn mà không tạo đơn. Mọi API tính phí đều **chỉ đọc**:

| Chế độ | Điều kiện | Được làm gì |
|---|---|---|
| `mock` | thiếu token, hoặc `GHN_MODE=mock` | Không gọi ra ngoài, phí là số giả lập |
| `readonly` | **mặc định** khi có token | Tra cứu địa giới + **tính phí thật**. Tạo/huỷ vận đơn bị chặn ngay trước khi gói tin rời máy chủ |
| `preview` | `GHN_MODE=preview` | **Chế độ nên dùng khi test.** Gọi API `/v2/shipping-order/preview` thật: GHN kiểm tra địa chỉ, dịch vụ, giới hạn cân/kích thước, trả về phí và ngày giao dự kiến — nhưng **không tạo vận đơn, không phát sinh cước** |
| `live` | `GHN_ALLOW_WRITE=true` | Tạo vận đơn thật, phát sinh cước |

#### Test tạo vận đơn mà không tốn tiền

```
GHN_MODE=preview
GHN_ALLOW_WRITE=false
```

Bấm "Tạo vận đơn" trong admin sẽ chạy **toàn bộ** luồng thật: dựng payload, gọi GHN, nhận phí và ngày giao dự kiến, ghi bản ghi vận đơn, gửi email báo mã cho khách. Khác biệt duy nhất là GHN không tạo đơn và trả `order_code` rỗng.

Vì mã rỗng, hệ thống sinh mã thay thế `PREVIEW-<mã đơn>` và ghi nhãn khác hẳn:

| Trường | Preview | Thật |
|---|---|---|
| `carrier` | `GHN (preview)` | `GHN` |
| `provider` | `ghn-preview` | `ghn` |
| `status` | `preview` | `label_created` |
| Mã vận đơn | `PREVIEW-DC-260726-AB2C` | `FFFNL9HH` |

Nhãn `carrier` khác khiến giao diện **tự động ẩn link tra cứu GHN** — link đó sẽ 404 với mã giả. Mã giả cố ý trông không giống mã thật vì nó đi vào email gửi khách và vào cơ sở dữ liệu.

⚠️ **Preview và create có giới hạn KHÁC nhau** theo tài liệu GHN: preview giới hạn 30kg / 150cm / COD 10 triệu, còn create là 50kg / 200cm / COD 50 triệu. Một kiện qua được preview vẫn có thể bị create từ chối, và ngược lại. Kiện cồng kềnh hoặc đơn giá trị cao nên thử thêm một lần ở `live` trước khi chạy thật.

`GHN_MODE=live` **vẫn phải kèm** `GHN_ALLOW_WRITE=true` — hai lớp xác nhận cho thao tác tốn tiền.

Gọi `master-data`, `available-services`, `fee` bao nhiêu lần cũng không tạo ra gì và không tốn tiền. Chỉ `create order` mới có hệ quả thật — và nó bị chặn cho tới khi bạn bật rõ ràng.

*Ghi chú thiết kế:* bản đầu chặn theo URL ("sandbox thì bắt buộc dùng dev gateway"). Cách đó sai ở chỗ khi gateway dev chết, cấu hình "đúng" theo luật cũ lại làm chết toàn bộ tính năng — trong khi thứ thực sự nguy hiểm chưa bao giờ là URL, mà là thao tác ghi.


**Rào cản đã xử lý**: GHN tính phí theo `to_district_id` (số) và `to_ward_code` (chuỗi mã) từ bộ dữ liệu địa giới riêng của họ — địa chỉ text tự do không gọi được API. Form địa chỉ nay là **3 dropdown** lấy từ dữ liệu GHN đã cache trong DB.

| Thành phần | Vai trò |
|---|---|
| `ghn.parcel.ts` | Gộp giỏ hàng thành kiện: cộng cân theo số lượng, **trọng lượng quy đổi** (÷5000), cân mặc định 500g khi biến thể chưa khai báo, chặn quá 30kg |
| `ghn.fee.ts` | Chính sách phí: ngưỡng miễn phí, trợ giá, làm tròn xuống đồng chẵn, mã lý do khi không báo được giá |
| `ghn.provider.ts` | Gọi API GHN v2 thật, timeout 10s |
| `ghn.mode.ts` | **Mô hình an toàn theo quyền thao tác** (10 test) — xem bên dưới |
| `buildFeeRequestBody()` | Dựng payload phí — hàm thuần, 8 test. Xử lý luật "một trong hai": `service_id` **hoặc** `service_type_id`, không được gửi cả hai |
| `ghn.mock.ts` | Provider giả lập khi chưa có tài khoản |
| `ghn.service.ts` | Cache địa giới, đồng bộ, báo giá |

**Thứ tự chạy:**

```bash
npm run migrate      # migration 022 + 023
npm run ghn:check    # tự kiểm tra token/kho/dịch vụ/tính phí — chạy TRƯỚC khi sync
npm run ghn:sync     # nạp 63 tỉnh, ~700 quận/huyện, ~11.000 phường/xã
```

`ghn:check` kiểm tra từng giả định có thể sai và nói rõ phải sửa gì: token đúng môi trường chưa, đã khai địa chỉ kho chưa, tuyến có `service_type_id` mình cấu hình không, và in ra phí thật của một kiện 500g. Không in token ra màn hình.

Chưa có `GHN_TOKEN`/`GHN_SHOP_ID` thì lệnh này nạp **dữ liệu mẫu** (3 tỉnh, vài quận/phường) đủ để chạy luồng đặt hàng ở dev. Có token thật thì chạy lại để ghi đè bằng dữ liệu đầy đủ.

**Nguyên tắc chống gian lận**: client chỉ gửi **điểm đến**, không gửi số tiền hay cân nặng. Server tự đọc cân nặng từ CSDL và hỏi lại GHN khi tạo đơn. Không báo được phí thì **không tạo đơn** — thà chặn còn hơn nhận một đơn mà cửa hàng chưa biết chi phí giao.

**Điểm đi của tuyến — nguyên nhân lỗi `route not found service`**

GHN tính phí theo **tuyến** (`from_district` → `to_district`), không theo điểm đến đơn lẻ. Nếu tra `available-services` ở một tuyến rồi gọi `fee` ở tuyến khác, `service_id` lấy được sẽ không tồn tại trên tuyến thật và GHN trả `route not found service`.

Hệ thống nay luôn xác định điểm đi **trước** khi gọi, theo thứ tự:

1. `GHN_FROM_DISTRICT_ID` / `GHN_FROM_WARD_CODE` nếu có khai trong env.
2. Nếu không, đọc kho đã đăng ký qua `/v2/shop/all`, khớp theo `GHN_SHOP_ID` (cache trong bộ nhớ).
3. Không có kho nào → trả `carrier_unavailable`, **không** để GHN tự đoán.

Cùng một điểm đi đó được dùng cho **cả** `available-services` lẫn `fee`. Có test hồi quy riêng cho bất biến này.

**Bốn cạm bẫy đã xử lý sau khi đối chiếu tài liệu:**

| Vấn đề | Hệ quả nếu bỏ qua |
|---|---|
| `WardCode` được tài liệu in dạng **số** (`510101`) nhưng API phí nhận **chuỗi** | Dropdown so sánh `number === string` luôn sai → khách chọn phường mà giá trị không được ghi nhận. Đã ép `String()` khi đồng bộ |
| Phường/xã có **SupportType riêng** | Quận mở nhưng phường bị khoá → khách đặt được đơn rồi mới lỗi ở bước tạo vận đơn. Nay chặn ở cả hai cấp |
| Không tuyến nào cũng mở đủ dịch vụ | Gửi `service_type_id=2` cho tuyến không có → lỗi. Nay lấy `service_id` từ `available-services` (có cache theo tuyến) |
| Thứ tự spread khi dựng payload | `service_type_id: undefined` ghi đè mất giá trị mặc định → GHN báo thiếu service. Đã tách thành hàm thuần + test riêng |

Đồng bộ ghi theo **lô** (`bulkCreate` + `updateOnDuplicate`) — ~11.000 phường nếu upsert từng dòng sẽ mất hàng chục phút và dễ đứt giữa đường.

⚠️ **Cần làm trước khi chạy thật**: khai báo `weight_gram` và kích thước cho từng biến thể sản phẩm. Thiếu thì hệ thống dùng mặc định 500g — cố ý đặt cao để báo dư còn hơn báo thiếu, nhưng vẫn là con số đoán.

---

### (Lịch sử) Quy đổi USD → VND
Cửa hàng niêm yết **USD**, VNPay chỉ nhận **VND**. Quy tắc đã cài đặt (`vnpay.fx.ts`, 14 unit test):

| Quy tắc | Chi tiết |
|---|---|
| Tỉ giá | `VNPAY_USD_TO_VND`, **không có mặc định**. `< 1000` bị coi là cấu hình sai → `FxConfigurationError` |
| Chặn sớm | Tạo đơn → `503`; API báo giá → `503`; FE **ẩn hẳn** lựa chọn VNPay |
| Làm tròn | **Lên** bội số `1.000đ` — cửa hàng không bao giờ thu thiếu |
| Tối thiểu | `5.000đ` (ngưỡng VNPay) |
| Chốt tỉ giá | Ghi vào `payments.charged_amount` / `fx_rate` / `charged_currency` khi tạo đơn (migration `020`) |
| Đối soát IPN | So `vnp_Amount` với **bản chốt**, không tính lại theo tỉ giá hiện hành |
| Hiển thị | Checkout gọi `GET /api/payments/vnpay/quote?amount=` → khách thấy đúng số tiền VND trước khi bấm |

Ví dụ đã kiểm chứng: đơn **$350** → `9.100.000 ₫` → `vnp_Amount = 910000000` (trước đây gửi sai thành `350đ`).

⚠️ **Còn lại cần quyết định**: tỉ giá vẫn là **hằng số tĩnh**, phải sửa tay khi thị trường biến động (lệch >3% nên cập nhật). Khuyến nghị trung hạn: chuyển hẳn sang **niêm yết VND** cho thị trường Việt Nam để bỏ hoàn toàn lớp quy đổi.

---

## 7. Lưu ý vận hành
- **Sao lưu Postgres** định kỳ (dữ liệu đơn hàng + tiền).
- **Không commit `.env`**; secrets đặt trong dashboard của nền tảng.
- Ảnh sản phẩm nằm trên **Cloudinary** (không phụ thuộc đĩa máy chủ) — an toàn khi container bị tạo lại.
- Rate limit + audit log đã bật sẵn (W-09/W-10).
- Nếu đổi domain: cập nhật `NEXT_PUBLIC_SITE_URL` rồi **build lại FE** (biến được inline lúc build).

---

## 8. Sự cố đã xử lý sẵn (ghi lại để không lặp)
- **Alias `@/` trong bản build**: `dist/` giữ nguyên `require("@/...")` mà Node không hiểu → đã thêm `register-paths.js` và đổi `npm start` thành `node -r ./register-paths.js dist/server.js`; `tsconfig-paths` đã chuyển sang **dependencies** (cần lúc chạy thật).
- **`npm ci` xung đột peer** (bullmq ↔ redis) → Dockerfile dùng `--legacy-peer-deps`.
