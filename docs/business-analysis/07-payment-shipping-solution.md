# Declay Store — Giải pháp Thanh toán & Vận chuyển (Payment & Shipping Solution)

**Companion to:** `03-system-design.md`, `05-implementation-workplan.md` (W-08, W-15, W-25, W-26)
**Ngày lập:** 2026-07-17
**Đối tượng đọc:** Product owner, BA, Dev lead
**Bối cảnh:** Bán tượng handmade (hàng vật lý). Mục tiêu **cả nội địa VN và quốc tế**.

---

## 1. Quyết định nền tảng (đã chốt với product owner)

| Câu hỏi | Chốt | Hệ quả |
|---|---|---|
| Pháp nhân | **Chưa đăng ký / muốn đơn giản** | MoR không phù hợp hàng vật lý → cần tối thiểu **hộ kinh doanh** để bán thật |
| Thị trường | **VN + quốc tế song song** | Cần cả cổng/hãng nội địa lẫn quốc tế, chọn theo vùng |
| Incoterm quốc tế | **DDP** (mặc định) | Prepay thuế nhập ở checkout → giảm hoàn hàng |

**Lưu ý pháp lý quan trọng:** bán **hàng vật lý + nhận tiền thật + có ship/COD** thì "không đăng ký gì" không bền vững (rủi ro thuế/pháp lý, không lên được cổng chính thống). Khuyến nghị đăng ký **hộ kinh doanh cá thể** (rẻ, nhanh) làm mốc tối thiểu. Merchant of Record (Paddle/Lemon Squeezy/Dodo) **chỉ phục vụ hàng số/SaaS**, không xử lý giao hàng vật lý → không dùng cho shop này.

---

## 2. Giải pháp Thanh toán

### 2.1. Nguyên tắc kiến trúc
Trừu tượng hoá **`PaymentProvider`** (giống `ShippingProvider` đã làm ở W-25): nhiều cổng cùng tồn tại, **chọn theo vùng/tiền tệ của khách**. Mỗi provider tự lo: khởi tạo giao dịch, xác nhận (webhook/redirect return), hoàn tiền. Đơn hàng lưu `payment_method` + tham chiếu provider trong bảng `payments` đã có (W-04).

### 2.2. Danh mục provider

| Provider | Vai trò | Thị trường | Ghi chú |
|---|---|---|---|
| **VNPay** | Cổng chính | **Nội địa + thẻ quốc tế** | Một tích hợp phủ ATM/QR/ví + Visa/Master. Cần hộ KD + tài khoản NH VN. Có sandbox. |
| **VietQR / Bank transfer (thủ công)** | Bán thử ngay | Nội địa | Khách quét QR chuyển khoản; admin xác nhận tay. Không cần cổng. Không nhận thẻ quốc tế. |
| **COD** | Thu tiền khi giao | Nội địa | Đối soát qua hãng vận chuyển (GHN/GHTK thu hộ). |
| **Stripe** (tuỳ chọn) | Thẻ quốc tế | Quốc tế | Chỉ khi có **pháp nhân nước ngoài**. Giữ như một provider tuỳ chọn. |
| ~~Merchant of Record~~ | — | — | **Loại**: không hỗ trợ hàng vật lý. |

### 2.3. Chọn phương thức theo vùng
- Địa chỉ **VN** → VNPay (thẻ/QR/ví) · VietQR · **COD**.
- Địa chỉ **ngoài VN** → VNPay (thẻ quốc tế) hoặc Stripe (nếu bật); **không COD**; áp **DDP** (prepay thuế).

### 2.4. Interface đề xuất
```ts
interface PaymentProvider {
  name: string;                 // 'vnpay' | 'bank_transfer' | 'cod' | 'stripe'
  supportsRegion(region: 'domestic' | 'international'): boolean;
  createPayment(order): Promise<{ redirectUrl?: string; reference: string; instructions?: string }>;
  verifyCallback(payload): Promise<{ reference: string; paid: boolean; raw: unknown }>;
  refund?(paymentRef, amount): Promise<void>;
}
```

---

## 3. Giải pháp Vận chuyển

### 3.1. Nguyên tắc
Tầng **`ShippingProvider` carrier-agnostic** đã dựng ở W-25 (mock chạy được, Easyship skeleton). Trạng thái giao lấy từ **webhook hãng** (đã có endpoint + service idempotent) + **job polling đối soát** (backup).

### 3.2. Danh mục
| Hãng | Thị trường | Ghi chú |
|---|---|---|
| **GHN / GHTK** | Nội địa VN | API + webhook + **COD**. Rẻ, phổ biến. |
| **Easyship** (aggregator) | Quốc tế | Một API nhiều hãng, **chứng từ hải quan + DDP**, tracking webhook. Sandbox theo token. |
| Mock provider | Dev/test | Giả lập luồng create→track→delivered không cần tài khoản. |

### 3.3. Xác nhận "đã giao"
Không ai bấm tay giả (đã bỏ ở W-08). `delivered` chỉ đến từ mã trạng thái của hãng (webhook), kèm POD. Job polling đối soát đơn `shipped` quá hạn.

---

## 4. Luồng checkout hợp nhất (payment × shipping)

1. Khách nhập địa chỉ → hệ thống xác định **vùng** (VN/quốc tế).
2. Hiện **rate vận chuyển** phù hợp (provider) + **phương thức thanh toán** phù hợp vùng.
3. Nếu quốc tế + DDP: **cộng thuế/nhập ước tính** (Easyship) vào tổng đơn.
4. Khách trả:
   - VNPay/Stripe → redirect/PaymentIntent → webhook xác nhận `paid`.
   - VietQR → hiện QR + nội dung CK → admin xác nhận `paid`.
   - COD → đơn `paid`-logic hoãn (thu khi giao); tồn vẫn được giữ.
5. `paid` → tạo shipment qua provider (mua nhãn) → tracking webhook đẩy `shipped`→`delivered`.

---

## 5. Rủi ro & Edge case
- Stripe **không cấp** tài khoản pháp nhân VN → phụ thuộc VNPay/hộ KD.
- Đối soát **COD** (tiền hãng thu hộ vs trạng thái delivered) — cần bước reconcile.
- Quốc tế **DDU** → tỉ lệ hoàn hàng cao; chọn DDP.
- Webhook rớt (thanh toán & vận chuyển) → cần polling/reconcile + idempotency (đã áp cho Stripe W-01 và shipment W-25).
- VietQR thủ công: rủi ro khớp sai giao dịch → cần mã tham chiếu (order id) trong nội dung CK.
- Đa tiền tệ: hiển thị/đối soát theo currency; VNPay dùng VND.

---

## 6. Lộ trình triển khai (tách increment, verify từng bước)

| # | Hạng mục | Map W-item | Trạng thái |
|---|---|---|:--:|
| P-1 | Tầng `PaymentProvider` + registry + helper chọn theo vùng (có test) | W-26 | 🟡 Foundation (chưa wire vào checkout) |
| P-2 | Provider **VietQR / bank-transfer thủ công** + migration payments (method/provider/ref) | W-26 | 🟡 Provider xong (chưa wire checkout) |
| P-3 | Provider **VNPay** (sandbox trước) + webhook/return verify | W-26 | ⬜ |
| P-4 | **COD** như một phương thức + đối soát với hãng | W-26/W-25 | ⬜ |
| S-1 | Tầng `ShippingProvider` + mock + webhook idempotent | W-25 | ✅ |
| S-2 | **Easyship** thật (sandbox) + mua nhãn + hải quan/DDP + HMAC webhook | W-25 | ⬜ |
| S-3 | **GHN/GHTK** nội địa (COD) | W-25 | ⬜ |
| S-4 | Job **polling/đối soát** trạng thái giao | W-25 | ⬜ |

**Thứ tự khuyến nghị:** P-1 → P-2 (bán thử nội địa ngay) → S-1(done)/mock để demo → P-3 VNPay sandbox → S-2 Easyship sandbox → P-4 COD + S-3 GHN → S-4 polling.

---

## 7. Definition of Done (áp cho mọi provider)
Provider chỉ "xong" khi: chọn đúng theo vùng; khởi tạo + xác nhận (webhook/return) **idempotent**; hoàn tiền (nếu áp dụng); ghi `payments`/`shipments` + audit; có sandbox/mock để test không cần tài khoản thật; và có UAT scenario được QA xác nhận.
