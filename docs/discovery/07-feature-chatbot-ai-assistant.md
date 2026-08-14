# 07 — Phân tích tính năng: Chatbot (khách) & AI Assistant (admin)

**Ngày:** 2026-07-17 · **Loại:** Phân tích yêu cầu nghiệp vụ (BA).
**Liên quan:** `00-requirements-summary.md`, `03-scope-and-mvp.md`

---

## 0. Bối cảnh & cảnh báo phạm vi
- Trong MoSCoW, hai tính năng này thuộc **COULD (làm sau khi có tín hiệu thị trường)** — **không thuộc MVP 1 tháng**. Thêm ngay sẽ **chậm lần bán đầu**.
- **Tái dùng:** bản cũ đã có sẵn `ChatWidget`, `/api/chat`, `/api/admin/assistant` với cơ chế tool + cổng duyệt (destructive-confirm) và audit → khớp hướng "đề xuất→duyệt", nên **kế thừa thay vì viết mới**.
- **Khuyến nghị:** làm **lát mỏng an toàn trước**, mở rộng dần (xem §5 Phased).

---

## A. CHATBOT (dành cho KHÁCH)

**Chốt:** làm FAQ/chính sách · gợi ý sản phẩm · tra cứu đơn · chuyển người thật. Công nghệ **kết hợp (AI + kho tri thức/RAG)** để giảm trả lời sai.

### A1. Actor
- Khách vãng lai (guest) · Khách đã đăng nhập · Nhân viên (nhận handoff).

### A2. Workflow
1. Khách mở widget → chọn nhanh (FAQ) hoặc gõ tự do.
2. Bot phân loại ý định: FAQ / gợi ý SP / tra cứu đơn / khác.
3. **FAQ & gợi ý**: AI trả lời **bám kho tri thức (RAG)**: chính sách + dữ liệu sản phẩm. Có nguồn.
4. **Tra cứu đơn**: **bắt buộc xác thực** (đăng nhập hoặc mã đơn + SĐT khớp) → trả trạng thái đơn của **chính khách đó**.
5. Không chắc/khách yêu cầu → **chuyển người thật** (tạo hàng chờ + thông báo staff).

### A3. Business rules
- BR-C1: Bot **chỉ dùng kho tri thức + dữ liệu công khai**; không bịa chính sách. Câu ngoài phạm vi → đề nghị chuyển người thật.
- BR-C2: **Tra cứu đơn phải xác thực** — không lộ đơn/PII của người khác.
- BR-C3: Không tư vấn cam kết sai (thời gian ship, tồn kho) — lấy số liệu thật khi có.
- BR-C4: Có **giới hạn tần suất** (rate limit) chống lạm dụng/chi phí API.

### A4. Data
- **Kho tri thức**: FAQ, chính sách (ship/đổi-trả/thanh toán), mô tả sản phẩm.
- Hội thoại (lưu để cải thiện + handoff), liên kết `user_id`/`session`.
- **Không** đưa dữ liệu nhạy cảm (giá vốn, đơn người khác, PII) vào ngữ cảnh trả cho khách.

### A5. Permission · Notification · Audit · Reporting
- **Permission:** công khai (guest được); tra cứu đơn cần xác thực.
- **Notification:** handoff → báo staff (hàng chờ hỗ trợ).
- **Audit:** log hội thoại + lần handoff.
- **Reporting:** số câu hỏi, tỉ lệ tự giải quyết, chủ đề hay hỏi (giúp cải thiện FAQ & sản phẩm).

---

## B. AI ASSISTANT (dành cho ADMIN)

**Chốt mức quyền:** **Đề xuất → admin duyệt mới ghi** (human-in-the-loop). Use: hỏi số liệu · soạn nội dung · hỗ trợ vận hành · tạo/sửa dữ liệu (qua duyệt).

### B1. Actor
- **Admin** (toàn quyền, được duyệt hành động ghi) · **Staff** (chỉ hỏi-đáp/đọc, KHÔNG được đề xuất ghi) — khớp phân quyền vòng 5.

### B2. Workflow (mấu chốt: propose → approve)
1. Admin hỏi bằng ngôn ngữ tự nhiên.
2. **Đọc/hỏi-đáp** (doanh thu, đơn, tồn, **SKU bán chạy**) → trả lời ngay (chỉ đọc).
3. **Soạn nội dung** (mô tả SP, bài social, email) → trả **bản nháp**; admin copy dùng.
4. **Tạo/sửa dữ liệu** (SP, giá, mã giảm giá…) → AI tạo **đề xuất (draft action)** kèm tóm tắt thay đổi → **admin bấm DUYỆT** mới ghi; **không tự áp dụng**.
5. Mọi hành động ghi (sau duyệt) → **ghi audit** (ai, gì, trước/sau, nguồn = AI).

### B3. Business rules (an toàn là số 1)
- BR-A1: **Không tự thực thi hành động ghi** — luôn cần admin duyệt.
- BR-A2: **Staff không được** kích hoạt đề xuất ghi (chỉ đọc/hỏi-đáp).
- BR-A3: **Ẩn dữ liệu nhạy cảm theo quyền**: giá vốn/margin & PII chỉ hiện đúng vai; không đưa vào ngữ cảnh cho vai không đủ quyền.
- BR-A4: **Ràng buộc bắt buộc** cho hành động nhạy cảm (vd tạo mã giảm giá phải có hạn dùng + trần số lần) — chống AI tạo mã "vô hạn".
- BR-A5: **Rate limit** + trần chi phí API.
- BR-A6: Số liệu trả về phải **truy vấn thật từ DB**, không "đoán".

### B4. Data
- Truy cập (đọc) dữ liệu vận hành: đơn, sản phẩm, tồn, báo cáo per-SKU.
- Draft actions (đề xuất chờ duyệt) + trạng thái duyệt.
- Audit log hành động ghi.

### B5. Permission · Notification · Audit · Reporting
- **Permission:** chỉ **Admin** được duyệt ghi; Staff chỉ đọc. Gate ở cả API tool.
- **Notification:** (tuỳ) báo khi có đề xuất chờ duyệt.
- **Audit:** **bắt buộc** — mọi tool đọc nhạy cảm + mọi hành động ghi (source=AI, actor=admin duyệt).
- **Reporting:** nhật ký đề xuất/duyệt/từ chối để rà soát.

---

## 5. Phased (khuyến nghị để không chặn MVP)
- **Phase A — Lát mỏng an toàn (nếu làm sớm):** Chatbot **FAQ (kịch bản) + handoff**; AI admin **chỉ đọc "hỏi số liệu"** (tái dùng báo cáo per-SKU). Rẻ, an toàn, ít rủi ro.
- **Phase B:** Chatbot **AI+RAG** (gợi ý SP, tra cứu đơn có xác thực); AI admin **soạn nội dung (nháp)**.
- **Phase C:** AI admin **đề xuất→duyệt** cho tạo/sửa dữ liệu (gate quyền + ràng buộc + audit đầy đủ).

## 6. Edge case (rủi ro cần xử lý)
- **Hallucination / trả lời sai** (chính sách, tồn, giá) → RAG + trích nguồn + "không chắc thì chuyển người thật".
- **Prompt injection** (khách/nội dung chèn lệnh) → tách biệt lệnh hệ thống ↔ nội dung; không cho bot ra lệnh ghi.
- **Rò rỉ dữ liệu**: giá vốn/margin, PII, đơn người khác → lọc theo quyền + xác thực tra cứu đơn.
- **AI tạo mã giảm giá/khuyến mãi nguy hiểm** → ràng buộc bắt buộc + duyệt.
- **Chi phí API tăng đột biến** → rate limit + trần ngân sách + cache câu hỏi phổ biến.

## 7. Dependencies
- **Nhà cung cấp LLM** (API key + chi phí theo token).
- **Kho tri thức** (FAQ/chính sách/mô tả SP) phải được soạn/duyệt.
- **Báo cáo per-SKU** (từ MVP) — nguồn để AI "hỏi số liệu".
- **Audit log** + phân quyền Admin/Staff (đã có nền).

## 8. Impact
- **Thời gian/ngân sách tăng**, có nguy cơ **chậm mốc kiểm chứng 1 tháng** → cân nhắc để **sau khi có tín hiệu**, hoặc chỉ làm **Phase A**.
- **Chi phí vận hành mới** (API LLM) — cần ngân sách (mục đang mở ở `06`).

## 9. Câu hỏi cần xác nhận
1. Có làm **ngay** (rủi ro chậm MVP) hay **để sau khi kiểm chứng**? Nếu làm ngay → chỉ **Phase A**?
2. **Nhà cung cấp LLM** & ngân sách API/tháng?
3. Ai chịu trách nhiệm **soạn kho tri thức** (FAQ/chính sách)?
4. Ngôn ngữ bot: **VN trước** hay VN+EN ngay?
