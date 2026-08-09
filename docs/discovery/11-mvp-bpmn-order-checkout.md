# 11 — BPMN chi tiết: Đặt hàng / Checkout & Fulfillment (MVP)

**Ngày:** 2026-07-17 · **Liên quan:** `04-order-process-and-lifecycle.md`, `10-mvp-srs-and-design.md`
**Ký hiệu:** khối chữ nhật = hành động; khối thoi `{}` = cổng quyết định; các `subgraph` = **làn (lane/actor)**; mũi tên cắt làn = bàn giao giữa actor.

---

## 1. Luồng Đặt hàng & Checkout (end-to-end)

```mermaid
flowchart TD
  subgraph KH[Lane - Khách]
    A1[Mo trang checkout] --> A2[Chon dia chi giao]
    A2 --> A3[Chon phuong thuc van chuyen]
    A3 --> A4{Co ma giam gia?}
    A4 -- Co --> A5[Nhap ma giam gia]
    A4 -- Khong --> A6[Chon phuong thuc thanh toan]
    A5 --> A6
    A6 --> A7[Xac nhan dat hang]
  end

  subgraph HT[Lane - He thong]
    B1{Ton du?}
    B2[Tinh phi ship theo zone + can nang]
    B3{Ma giam gia hop le?}
    B4[Tinh tong = subtotal - giam + ship, gia hieu luc = min goc/KM]
    B5[Giu cho ton + tao don]
    B6{Phuong thuc thanh toan?}
    B7[Don processing + bao Staff]
    B8[Don pending_payment]
    B9[Xac nhan paid -> processing + bao Staff]
    B10[Huy don + hoan ton]
  end

  subgraph VN[Lane - VNPay]
    C1[Trang thanh toan VNPay] --> C2{Tra tien thanh cong?}
    C2 -- Co --> C3[Webhook tra ket qua]
    C2 -- Khong / het han --> C4[Khong thanh toan]
  end

  A7 --> B1
  B1 -- Khong --> X1[Bao het hang - dung]
  B1 -- Co --> B2 --> B3
  B3 -- Khong --> X2[Bao ma khong hop le]
  B3 -- Hop le / khong ma --> B4 --> B5 --> B6
  B6 -- COD --> B7
  B6 -- VNPay --> B8 --> C1
  C3 --> B9
  C4 --> B10
```

### Bảng bước & cổng (checkout)
| Bước | Actor | Mô tả | Rule |
|---|---|---|---|
| A1–A7 | Khách | Nhập địa chỉ, chọn ship, mã giảm, phương thức, xác nhận | — |
| B1 | Hệ thống | **Kiểm tra tồn** trước khi tạo đơn | BR-02 |
| B2 | Hệ thống | Tính phí ship theo **zone + cân nặng** | FR-06, cần weight |
| B3 | Hệ thống | Validate **mã giảm giá** (hạn dùng, trần) | BR-08 |
| B4 | Hệ thống | Tổng = subtotal − giảm + ship; **giá hiệu lực = min(gốc, KM)** | BR-01 |
| B5 | Hệ thống | **Giữ chỗ tồn** + tạo đơn | BR-02 |
| B6 | Hệ thống | Rẽ nhánh theo phương thức | BR-03 |
| B7 | Hệ thống | **COD → processing ngay** | BR-03 |
| B8→C→B9 | Hệ thống/VNPay | **VNPay → pending_payment → paid → processing** | BR-03 |
| B10 | Hệ thống | VNPay hết hạn/huỷ → **cancelled + hoàn tồn** | BR-05 |

### Ngoại lệ
- **Hết tồn giữa lúc đặt (race):** update tồn có điều kiện `stock ≥ qty`; 0 dòng ảnh hưởng → báo hết hàng (chống oversell).
- **Mã giảm giá hết hạn/hết lượt:** chặn, giữ nguyên giỏ.
- **VNPay timeout:** giải phóng chỗ giữ tồn sau thời hạn.

---

## 2. Tương tác thanh toán VNPay (sequence)

```mermaid
sequenceDiagram
  participant KH as Khach
  participant HT as He thong
  participant VN as VNPay
  KH->>HT: Xac nhan dat hang (VNPay)
  HT->>HT: Tao don pending_payment + giu cho ton
  HT->>VN: Tao yeu cau thanh toan (so tien, ma don)
  VN-->>KH: Chuyen huong trang thanh toan
  KH->>VN: Nhap thong tin, tra tien
  VN-->>HT: Webhook ket qua (idempotent)
  alt Thanh cong
    HT->>HT: Danh dau paid -> processing
    HT-->>KH: Trang cam on / theo doi don
  else That bai / het han
    HT->>HT: Huy don + hoan ton
  end
```

---

## 3. Fulfillment (xử lý đơn → giao)

```mermaid
flowchart TD
  subgraph HT0[Lane - He thong]
    S0[Don o trang thai processing]
    D1{Co ma van don?}
    D2[Chuyen shipped]
    D3[Chuyen delivered]
    D4[COD - danh dau chua doi soat]
  end
  subgraph ST[Lane - Staff]
    S1[Dong goi hang] --> S2[Ban giao hang - pickup hoac tu mang]
    S2 --> S3[Nhap ma van don]
  end
  subgraph HVC[Lane - Hang van chuyen GHN-GHTK]
    P1[Nhan hang] --> P2[Dang giao] --> P3{Giao thanh cong?}
    P3 -- Co --> P4[Cap nhat da giao]
    P3 -- Khong --> P5[Giao that bai / hoan]
  end
  S0 --> S1
  S3 --> D1
  D1 -- Khong --> X[Chan - thieu ma van don]
  D1 -- Co --> D2 --> P1
  P4 --> D3 --> D4
  P5 --> E[Xu ly hoan / giao lai - thu cong]
```

| Bước | Actor | Rule |
|---|---|---|
| S1–S3 | Staff | Đóng gói, bàn giao **tuỳ lúc** (pickup/tự mang), **nhập mã vận đơn** | 
| D1/D2 | Hệ thống | **shipped bắt buộc mã vận đơn** — BR-04 |
| P4→D3 | Hãng/Hệ thống | Hãng báo giao xong → **delivered** |
| D4 | Hệ thống | COD → đưa vào danh sách **chưa đối soát** — BR-11 |

---

## 4. Huỷ & Đổi-trả

```mermaid
flowchart TD
  A{Trang thai don?}
  A -- pending_payment / processing --> B[Cho huy]
  B --> C{Da tra truoc?}
  C -- Co VNPay --> D[Hoan tien]
  C -- Khong COD --> E[Khong phat sinh tien]
  D --> F[Chuyen cancelled + hoan ton]
  E --> F
  A -- shipped --> G[Khong cho huy]
  A -- delivered --> H{Trong 7 ngay?}
  H -- Co --> I[Tao yeu cau doi-tra -> returned]
  H -- Khong --> J[Tu choi doi-tra]
```

| Nhánh | Rule |
|---|---|
| Huỷ trước ship | BR-05 (chỉ khi chưa shipped; hoàn tiền nếu đã trả) |
| Đổi-trả sau giao | BR-06 (trong **7 ngày**) |

---

## 5. Đối soát COD

```mermaid
flowchart TD
  A[Don COD delivered] --> B[Vao danh sach chua doi soat]
  B --> C[Staff/Admin nhan tien hang thu ho]
  C --> D{Khop so tien?}
  D -- Co --> E[Danh dau da doi soat]
  D -- Khong --> F[Ghi chu lech + xu ly]
```

---

## 6. Ánh xạ Business Rule (tổng hợp)
- **BR-01** giá hiệu lực · **BR-02** giữ chỗ/chống oversell · **BR-03** COD/VNPay → processing · **BR-04** ship cần mã · **BR-05** huỷ/hoàn · **BR-06** đổi-trả 7 ngày · **BR-08** mã giảm giá ràng buộc · **BR-11** đối soát COD. (Chi tiết ở `10`.)

## 7. Điểm tích hợp (integration touchpoints)
- **VNPay**: tạo yêu cầu thanh toán + **webhook idempotent** xác nhận `paid` (Should).
- **GHN/GHTK**: tạo vận đơn + **tracking webhook** cập nhật `delivered` (Should; MVP đầu nhập mã tay).
- **Cloudinary**: ảnh sản phẩm (đã tích hợp).
