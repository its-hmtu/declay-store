# Sơ đồ UML — Báo cáo Declay Store

27 sơ đồ vẽ bằng **PlantUML**. Tất cả **đã được nhúng sẵn** vào file `Bao-cao-Declay-Store-day-du-so-do.docx`; thư mục này giữ bản gốc để bạn dùng lại hoặc chỉnh sửa.

> **Lưu ý đánh số:** báo cáo bắt đầu từ **Chương 2 (Cơ sở lý thuyết)**, nên số hình cũng theo đó — Chương 2 có Hình 2.1, Chương 3 có Hình 3.1–3.9, Chương 4 có Hình 4.1–4.17, Chương 5 có Hình 5.1–5.22.

## Cấu trúc thư mục

| Thư mục | Nội dung | Dùng khi nào |
|---|---|---|
| `png/` | Ảnh PNG, 160 DPI | Chèn vào Word (đã nhúng sẵn trong tài liệu) |
| `svg/` | Ảnh vector SVG | Khi cần phóng to không vỡ nét hoặc in khổ lớn |
| `plantuml/` | Mã nguồn `.puml` | Khi muốn sửa nội dung sơ đồ rồi vẽ lại |

## Bảng tra cứu sơ đồ

### Chương 2 — Cơ sở lý thuyết

| Hình | Nội dung | Loại | Tên file |
|---|---|---|---|
| 2.1 | Mô hình Client – Server của hệ thống | Component | `Hinh-2.1-Mo-hinh-Client-Server` |

### Chương 3 — Phân tích, đặc tả chức năng

| Hình | Nội dung | Loại | Tên file |
|---|---|---|---|
| 3.1 | Kiến trúc tổng thể hệ thống | Component | `Hinh-3.1-Kien-truc-tong-the` |
| 3.2 | Use case tổng quát | Use case | `Hinh-3.2-Usecase-tong-quat` |
| 3.3 | Phân rã use case Giỏ hàng | Use case | `Hinh-3.3-Usecase-Gio-hang` |
| 3.4 | Phân rã use case Đặt hàng và thanh toán | Use case | `Hinh-3.4-Usecase-Dat-hang-thanh-toan` |
| 3.5 | Phân rã use case Quản lý đơn hàng | Use case | `Hinh-3.5-Usecase-Quan-ly-don-hang` |
| 3.6 | Phân rã use case Hủy đơn và trả hàng | Use case | `Hinh-3.6-Usecase-Huy-don-Tra-hang` |
| 3.7 | Phân rã use case Quản lý sản phẩm | Use case | `Hinh-3.7-Usecase-Quan-ly-san-pham` |
| 3.8 | Phân rã use case Hỗ trợ khách hàng | Use case | `Hinh-3.8-Usecase-Ho-tro-khach-hang` |
| 3.9 | Phân rã use case Quản lý người dùng | Use case | `Hinh-3.9-Usecase-Quan-ly-nguoi-dung` |

### Chương 4 — Thiết kế chức năng và cơ sở dữ liệu

| Hình | Nội dung | Loại | Tên file |
|---|---|---|---|
| 4.1 | Tuần tự Đăng ký | Sequence | `Hinh-4.1-Tuan-tu-Dang-ky` |
| 4.2 | Tuần tự Đăng nhập | Sequence | `Hinh-4.2-Tuan-tu-Dang-nhap` |
| 4.3 | Tuần tự Đăng xuất | Sequence | `Hinh-4.3-Tuan-tu-Dang-xuat` |
| 4.4 | Tuần tự Tìm kiếm sản phẩm | Sequence | `Hinh-4.4-Tuan-tu-Tim-kiem-san-pham` |
| 4.5 | Tuần tự Chi tiết sản phẩm | Sequence | `Hinh-4.5-Tuan-tu-Chi-tiet-san-pham` |
| 4.6 | Tuần tự Thêm vào giỏ hàng | Sequence | `Hinh-4.6-Tuan-tu-Them-vao-gio-hang` |
| 4.7 | Tuần tự Xóa khỏi giỏ hàng | Sequence | `Hinh-4.7-Tuan-tu-Xoa-khoi-gio-hang` |
| 4.8 | Tuần tự Đặt hàng và thanh toán | Sequence | `Hinh-4.8-Tuan-tu-Dat-hang-thanh-toan` |
| 4.9 | Tuần tự Xác nhận thanh toán qua webhook | Sequence | `Hinh-4.9-Tuan-tu-Webhook-thanh-toan` |
| 4.10 | Tuần tự Hủy đơn hàng | Sequence | `Hinh-4.10-Tuan-tu-Huy-don-hang` |
| 4.11 | Tuần tự Trả hàng và hoàn tiền | Sequence | `Hinh-4.11-Tuan-tu-Tra-hang-hoan-tien` |
| 4.12 | Tuần tự Thêm mới sản phẩm | Sequence | `Hinh-4.12-Tuan-tu-Them-san-pham` |
| 4.13 | Tuần tự Chỉnh sửa sản phẩm | Sequence | `Hinh-4.13-Tuan-tu-Sua-san-pham` |
| 4.14 | Tuần tự Xóa sản phẩm | Sequence | `Hinh-4.14-Tuan-tu-Xoa-san-pham` |
| 4.15 | Tuần tự Quản lý đơn hàng | Sequence | `Hinh-4.15-Tuan-tu-Quan-ly-don-hang` |
| 4.16 | Tuần tự Trợ lý ảo tích hợp AI | Sequence | `Hinh-4.16-Tuan-tu-Tro-ly-ao-AI` |
| 4.17 | Lược đồ quan hệ cơ sở dữ liệu | ERD | `Hinh-4.17-Luoc-do-quan-he-CSDL` |

> Hình 4.17 được đặt trên một **trang khổ ngang riêng** trong tài liệu để chữ trong lược đồ đủ lớn. Phần section break đã được tạo sẵn, không cần chỉnh thêm.

### Chương 5 — 22 ảnh chụp màn hình cần bổ sung

Hình **5.1 đến 5.22** là ảnh chụp màn hình thật, không vẽ được bằng UML. Trong tài liệu, mỗi chỗ này hiện là một dòng chữ nghiêng `[ Chèn hình: ... ]` — bạn xóa dòng đó rồi chèn ảnh vào đúng vị trí, giữ nguyên dòng chú thích bên dưới.

| Hình | Cần chụp |
|---|---|
| 5.1 | Kết quả chạy `npm run test` (Vitest) trong terminal |
| 5.2 | Kết quả `docker-compose up -d` và `docker ps` |
| 5.3 | Nhật ký khởi động máy chủ API (`npm run dev` ở `web-api`) |
| 5.4 | Nhật ký khởi động Next.js (`npm run dev` ở `web-fe`) |
| 5.5 – 5.22 | 18 màn hình giao diện, theo đúng thứ tự các mục ở phần Kết quả thực nghiệm |

Ngoài ra, trong 15 bảng đặc tả use case ở Chương 3 có dòng "Giao diện minh họa: Hình 5.x" — sau khi chèn xong ảnh chương 5, bạn thay `5.x` bằng số hình tương ứng.

## Cách chèn ảnh vào Word

1. Đặt con trỏ vào dòng `[ Chèn hình: ... ]`, xóa dòng đó.
2. **Insert → Pictures → This Device**, chọn ảnh.
3. Chọn ảnh → **Picture Format → Wrap Text → In Line with Text**, rồi căn giữa (Ctrl+E).
4. Giữ nguyên dòng chú thích `Hình x.y. ...` ngay bên dưới.

## Sửa và vẽ lại sơ đồ

Mã nguồn nằm trong `plantuml/`. Ba cách vẽ lại:

**Cách 1 — Online (không cần cài gì):** mở <https://www.plantuml.com/plantuml/uml/>, dán nội dung file `.puml`.

**Cách 2 — VS Code:** cài extension *PlantUML* (jebbs), mở file `.puml`, nhấn `Alt+D` để xem trước.

**Cách 3 — Dòng lệnh:**

```bash
java -jar plantuml.jar -tpng plantuml/*.puml -o ../png
java -jar plantuml.jar -tsvg plantuml/*.puml -o ../svg
```

Bảng màu đang dùng là tông đất ấm (`#7A5C43`, `#FBF3E7`, `#F3E7D8`) cho khớp nhận diện thương hiệu Declay Store. Muốn đổi màu thì sửa khối `skinparam` ở đầu mỗi file.
