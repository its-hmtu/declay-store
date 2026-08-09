# Ngôn ngữ thiết kế Nike.com & Đề xuất áp dụng cho Declay

> Nguồn khảo sát: https://www.nike.com/vn/ (trang chủ, mega menu, trang danh sách sản phẩm `/vn/w/`, trang chi tiết sản phẩm `/vn/t/...`) — khảo sát trực tiếp bằng trình duyệt (screenshot + computed CSS), ngày 28/07/2026.
> Stack hiện tại của Declay: Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/Radix UI + lucide-react.

---

## 1. Triết lý thiết kế tổng quan

Nike theo trường phái **"quiet minimalism, loud content"**: khung giao diện (chrome) gần như vô hình — nền trắng, chữ đen, không viền, không đổ bóng — để toàn bộ sự chú ý dồn vào ảnh sản phẩm/ảnh vận động viên khổ lớn. Điểm nhấn màu sắc chỉ xuất hiện ở nơi cần hành động hoặc thông tin trạng thái (giá giảm, hết hàng, bestseller).

Nguyên tắc rút ra:
1. **Ảnh làm chủ đạo, chữ hỗ trợ.** Hero luôn là ảnh/video toàn khổ, tiêu đề đặt chồng lên ảnh bằng chữ trắng/đen tương phản cao.
2. **Bảng màu trung tính tuyệt đối** (đen #111111, trắng #FFFFFF, xám nhạt #F5F5F5 cho nền section), màu thương hiệu chỉ dùng làm accent trạng thái.
3. **Không bo góc thẻ sản phẩm, nhưng nút CTA bo tròn hoàn toàn (pill).** Đây là tương phản hình học có chủ đích: khối ảnh vuông vức vs. nút bấm mềm mại.
4. **Khoảng trắng rộng rãi**, mật độ thông tin thấp trên trang chủ, tăng dần độ dày đặc khi vào PLP/PDP.
5. **Chuyển động tinh tế**: carousel tự động, hover đổi ảnh sản phẩm, không có hiệu ứng màu mè.

---

## 2. Typography

| Thuộc tính | Giá trị đo được trên Nike.com |
|---|---|
| Font chữ nội dung | `"Helvetica Now Text", Helvetica, Arial, sans-serif` |
| Font tiêu đề | `"Helvetica Now Display Medium", Helvetica, Arial, sans-serif` |
| Cỡ chữ cơ bản | 16px, weight 500 cho nav/label |
| Tiêu đề hero | Chữ rất lớn (~64–96px ở desktop), viết HOA, đè lên ảnh, tracking bình thường (không letter-spacing) |
| Section heading (vd "Featured") | ~28–32px, weight 400–500 |
| Không dùng chữ in nghiêng, không dùng serif ở bất kỳ đâu |

**Áp dụng cho Declay:** Helvetica Now là font trả phí độc quyền Nike, không nên sao chép nguyên bản. Khuyến nghị dùng font sans-serif hình học/trung tính có "vibe" tương tự và miễn phí: **Inter** hoặc **Helvetica Neue/Arial fallback** cho phần thân trang (đã hợp với hệ shadcn mặc định), và một font Display đậm hơn (vd **General Sans**, **Archivo**, hoặc **Inter Tight** weight 600–700) cho hero/tiêu đề lớn. Giữ nguyên tắc: heading viết hoa toàn bộ, không letter-spacing âm.

---

## 3. Bảng màu

| Vai trò | Màu | Mã hex (đo từ trang) |
|---|---|---|
| Nền chính | Trắng | `#FFFFFF` |
| Chữ chính | Đen gần tuyệt đối | `#111111` |
| Nền section phụ | Xám rất nhạt | `#F5F5F5` |
| Badge/nhãn cảnh báo (Bestseller, Sold Out) | Đỏ cam | `rgb(211,57,24)` ≈ `#D33918` |
| Giá giảm / % off | Xanh lá | `rgb(0,125,72)` ≈ `#007D48` |
| Giá gạch ngang | Xám trung | dùng `text-decoration: line-through`, màu xám ~ `#707072` |
| Nút CTA (trên nền ảnh tối) | Nền trắng, chữ đen, bo tròn `30px` | |
| Nút CTA (trên nền sáng) | Nền đen, chữ trắng, bo tròn `30px` | |

**Áp dụng cho Declay:** dựng lại theo cùng tỷ lệ 90% trung tính / 10% accent — nền trắng-đen làm chủ đạo, và dùng **màu thương hiệu Declay hiện có** thay cho đỏ-cam/xanh lá của Nike ở đúng 2 vị trí: badge trạng thái (hết hàng, mới, bán chạy) và chỉ báo giảm giá. Không thêm màu mới ngoài palette đã có trong `tailwind.config`/theme tokens của shadcn.

---

## 4. Bố cục & Grid

- **Header:** sticky, cao ~64–72px, 3 vùng: logo trái, nav chính giữa (New & Featured / Men / Women / Kids / Sale), icon phải (Search, Wishlist, Bag, Sign in). Nền trắng, không viền, không bóng đổ — chỉ có 1 dải thông báo mỏng (freeship) ngay dưới header, nền xám nhạt.
- **Mega menu:** dropdown full-width khi hover vào mục nav, chia **5 cột đều nhau**: Featured, Shoes, Clothing, Shop By Sport, Accessories & Equipment — mỗi cột có heading đậm + list link thường. Bên dưới list là hàng "Spotlight" gồm 8 thumbnail tròn/vuông sản phẩm nổi bật (icon + tên).
- **Hero section:** carousel toàn khổ (viewport width), ảnh nền lớn, tiêu đề + mô tả ngắn + nút "Shop" pill đặt góc dưới trái, có chấm/số trang carousel.
- **Section "Featured":** grid 2 cột lớn, mỗi ô là 1 card ảnh full-bleed cao, caption đè lên ảnh.
- **Product rail (trang chủ):** carousel ngang, mỗi card gồm ảnh vuông, tên sản phẩm, dòng mô tả phụ, giá.
- **PLP (`/vn/w/...`):** layout 2 cột — sidebar trái ~200px (filter theo danh mục, Gender, Kids, Shop By Price — dạng accordion) + grid phải **3 cột sản phẩm** (desktop), mỗi card: ảnh, badge trạng thái, tên, mô tả phụ (subtitle), giá (kèm giá gốc gạch ngang + % giảm nếu có).
- **PDP (`/vn/t/...`):** layout 2 cột — trái là gallery (dải thumbnail dọc + ảnh chính lớn, có nút điều hướng trái/phải), phải là panel thông tin sticky: nhãn thuộc tính (vd "Recycled Materials"), tên sản phẩm, subtitle, giá, nút "Favourite" dạng pill viền, khối callout thông tin nền xám, mô tả sản phẩm dạng văn bản dài.
- **Footer:** sitemap nhiều cột (Help, Company info, ...), chữ nhỏ, nền trắng, viền mỏng phân cách phía trên.

Container tổng thể không giới hạn max-width cứng ở hero (full bleed), nhưng nội dung dạng danh sách/lưới được căn giữa với padding ngang đều (~24–32px mobile, ~40–64px desktop).

---

## 5. Thành phần UI (component patterns)

| Component | Đặc điểm |
|---|---|
| Nút CTA chính | Pill, `border-radius: 30px`, padding `6px 16px`, weight 500, không viết hoa, không đổ bóng |
| Badge trạng thái | Chữ nhỏ, đậm, màu đỏ-cam, không nền (chỉ là text màu, không phải chip có nền) |
| Card sản phẩm | Không bo góc, không viền, không shadow — chỉ cách nhau bằng khoảng trắng (gutter) |
| Filter sidebar | List text đơn giản + accordion, không có ô checkbox nổi bật, hover gạch chân |
| Giá | Giá hiện tại đậm đen; nếu có giảm giá → giá gốc gạch ngang xám bên cạnh, % giảm màu xanh lá |
| Icon | Line icon tối giản (tim = wishlist, túi = giỏ hàng, kính lúp = search) |

---

## 6. Cấu trúc đường dẫn (URL/menu) của Nike — tham khảo IA

```
/vn/                          → Trang chủ
/vn/w/                        → Trang danh sách tất cả sản phẩm (PLP), lọc qua query string
/vn/w/mens-shoes               → PLP theo danh mục (slug mô tả + gender)
/vn/t/{slug}-{hash}/{sku}      → Trang chi tiết sản phẩm (PDP)
/vn/retail                     → Tìm cửa hàng
/vn/help, /vn/help/a/...       → Trung tâm hỗ trợ / bài viết trợ giúp
/vn/orders                     → Theo dõi đơn hàng
/vn/membership                 → Đăng ký thành viên (Join Us)
/vn/jordan                     → Sub-brand riêng
```

Nav chính chỉ có 5 mục cấp 1 (New & Featured / Men / Women / Kids / Sale) — cực kỳ tối giản; toàn bộ chiều sâu danh mục (Shoes/Clothing/Sport/Accessories) được đẩy xuống mega menu thay vì phơi bày ở thanh nav.

---

## 7. Đề xuất áp dụng cụ thể cho Declay (Next.js + Tailwind v4 + shadcn)

1. **Header:** giữ sticky, 3 vùng logo/nav/icon như Nike; thêm dải thông báo mỏng (ship/khuyến mãi) dùng `bg-muted` của theme. Nav chính chỉ nên có 4–5 mục cấp 1 tối đa.
2. **Mega menu:** dựng bằng Radix `NavigationMenu` (đã có `@radix-ui` trong deps), chia layout `grid-cols-4` hoặc `grid-cols-5` giống Nike, thêm hàng sản phẩm nổi bật (thumbnail tròn) ở cuối menu để tăng khả năng khám phá.
3. **Hero:** dùng `embla-carousel-react` (đã có sẵn trong package.json) để dựng carousel full-bleed, nút CTA pill `rounded-full`, overlay text trắng/đen tuỳ ảnh nền.
4. **Card sản phẩm:** bỏ shadow/border mặc định của shadcn Card, chỉ dùng khoảng cách (gap) để phân tách — đúng tinh thần "flat, image-first" của Nike.
5. **Badge trạng thái & giá giảm:** tạo 2 token màu mới trong theme (vd `--status-badge`, `--price-discount`) tách biệt khỏi màu primary, dùng nhất quán cho "Hết hàng / Bán chạy / Mới" và "% giảm giá".
6. **PLP:** layout `grid-cols-[220px_1fr]` — sidebar filter dùng shadcn `Accordion` + `Checkbox` (đã có `@radix-ui/react-checkbox`), phần lưới sản phẩm `grid-cols-3` desktop / `grid-cols-2` mobile.
7. **PDP:** layout 2 cột, gallery trái dùng thumbnail dọc + ảnh chính, panel phải sticky (`position: sticky; top: 96px`) chứa giá, nút thêm giỏ hàng dạng pill, và khối thông tin phụ nền `bg-muted`.
8. **Typography:** thiết lập font Display đậm (Archivo/Inter Tight) cho `h1`/hero, giữ Inter cho phần thân — khai báo qua `next/font` trong `app/layout.tsx`.
9. **Chuyển động:** hạn chế animation phức tạp — chỉ fade/slide nhẹ khi chuyển carousel hoặc hover đổi ảnh sản phẩm, đúng tinh thần tối giản của Nike.

---

## 8. Việc cần làm tiếp theo

- [ ] Chốt bảng màu accent chính thức của Declay (thay cho đỏ-cam/xanh lá tham khảo từ Nike)
- [ ] Chọn font Display + font Text, cấu hình `next/font`
- [ ] Dựng token Tailwind v4 (`@theme`) cho: `--radius-pill`, `--color-badge`, `--color-discount`
- [ ] Prototype mega menu bằng Radix NavigationMenu
- [ ] Rà soát ảnh sản phẩm hiện có của Declay có đủ độ phân giải/tỷ lệ để làm hero full-bleed như Nike không
