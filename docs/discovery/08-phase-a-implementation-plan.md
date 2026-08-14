# 08 — Kế hoạch triển khai Phase A (Chatbot + AI Assistant)

**Ngày:** 2026-07-17 · **Liên quan:** `07-feature-chatbot-ai-assistant.md`
**Phạm vi:** CHỈ Phase A (lát mỏng an toàn) — không làm write-actions của AI admin.

---

## 1. Quyết định đã chốt (mục 9)
| Chủ đề | Chốt |
|---|---|
| Nhà cung cấp LLM | **Anthropic (Claude)** |
| Ngân sách API/tháng | **~$20–$50** → dùng model rẻ (Claude Haiku) + cache + rate-limit |
| Kho tri thức | **Chủ shop tự soạn** (FAQ/chính sách) |
| Ngôn ngữ bot | **Việt + Anh** (KB phải song ngữ; Claude tự trả lời theo ngôn ngữ khách) |

## 2. Phạm vi Phase A (làm gì / KHÔNG làm)
**Chatbot khách — LÀM:**
- Claude trả lời **FAQ/chính sách** (ship, đổi-trả 7 ngày, thanh toán, size…) **bám kho tri thức song ngữ**.
- Tự nhận diện ngôn ngữ (VN/EN) và trả lời tương ứng.
- **Chuyển người thật (handoff)** khi không chắc/khách yêu cầu → tạo yêu cầu hỗ trợ + báo staff.

**AI Assistant admin — LÀM:**
- **Hỏi số liệu (chỉ đọc)**: doanh thu, số đơn, tồn thấp, **Top SKU bán chạy** — qua tool truy vấn DB thật.
- **Soạn nội dung (nháp)**: mô tả sản phẩm, bài social — **chỉ xuất text**, không ghi vào dữ liệu.

**KHÔNG làm ở Phase A (để Phase B/C):**
- Gợi ý sản phẩm / tra cứu đơn của chatbot (Phase B).
- AI admin **tạo/sửa dữ liệu qua duyệt** (Phase C — cần cổng duyệt + audit đầy đủ).

## 3. Kiến trúc & tái dùng
- Kế thừa `ChatWidget`, `POST /api/chat` (khách) và `POST /api/admin/assistant` (admin) sẵn có; thay lõi gọi model bằng **Anthropic SDK (Claude Haiku)**.
- **Read-only tools** cho AI admin: `get_sales_summary`, `get_top_skus`, `get_low_stock`, `get_order_count` — mỗi tool là truy vấn DB, **tôn trọng quyền** (ẩn `cost_price`/`margin` & PII; Staff không gọi được).
- Chatbot khách: prompt hệ thống nạp **kho tri thức** (FAQ/policy) — Phase A dùng cách đơn giản (inject KB vào context; nếu KB lớn thì cắt theo từ khoá).

## 4. Dữ liệu mới
- **`faqs`** (song ngữ): `id, question_vi, answer_vi, question_en, answer_en, is_active` — chủ shop CRUD trong admin.
- **`support_requests`** (handoff): `id, user_id?, session, message, status(open/handled), created_at`.
- **`assistant_audit`** (đọc nhạy cảm): actor, tool, tham số, thời gian.
- Hội thoại chatbot (tuỳ chọn lưu để cải thiện).

## 5. Config & kiểm soát chi phí (bắt buộc)
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-haiku-*` (rẻ), `AI_MONTHLY_BUDGET_USD` (mặc định 50).
- **Rate limit** per-session (khách) & per-admin.
- **Cache** câu FAQ phổ biến (giảm gọi API).
- **Trần ngân sách**: vượt ngưỡng → chatbot tự chuyển "gặp người thật", AI admin tạm khoá — chống hoá đơn bất ngờ.
- **Streaming** phản hồi để UX mượt (tuỳ chọn).

## 6. Phân rã công việc (ước lượng chỉ báo)
| # | Việc | Est (ngày) |
|---|---|:--:|
| AI-1 | Tích hợp Anthropic SDK + config model/budget + rate-limit + trần chi phí | 1–1.5 |
| AI-2 | Bảng `faqs` (song ngữ) + admin CRUD | 1 |
| AI-3 | Chatbot khách: trả lời FAQ bám KB + tự nhận ngôn ngữ | 1–1.5 |
| AI-4 | Handoff: `support_requests` + thông báo staff + UI hàng chờ | 1 |
| AI-5 | AI admin read-only tools (sales/top-SKU/low-stock/orders) + tôn trọng quyền | 1.5–2 |
| AI-6 | AI admin soạn nội dung (nháp) trong giao diện assistant | 0.5 |
| AI-7 | `assistant_audit` (đọc nhạy cảm) + kiểm thử phân quyền Staff/Admin | 1 |
| AI-8 | Test (unit: quyền/ẩn dữ liệu; e2e nhẹ luồng chat/handoff) | 1 |
| | **Tổng** | **~8–9.5 ngày-người** |

## 7. Definition of Done (Phase A)
- Chatbot trả lời FAQ đúng KB (VN/EN), **không bịa**, và **chuyển người thật** khi ngoài phạm vi.
- AI admin trả lời số liệu **truy vấn thật**, **không lộ** giá vốn/PII, **Staff không xem được** số nhạy cảm.
- **Không có bất kỳ hành động ghi** nào từ AI ở Phase A.
- Có **rate-limit + trần ngân sách** hoạt động; có **audit** đọc nhạy cảm.
- Test phân quyền pass.

## 8. Rủi ro & giảm thiểu
- **Chi phí vượt** → model rẻ + cache + rate-limit + trần ngân sách (đã thiết kế).
- **Trả lời sai** → bám KB + "không chắc thì chuyển người thật".
- **Rò rỉ dữ liệu** → tool tôn trọng quyền; KB khách không chứa dữ liệu nội bộ.
- **Prompt injection** → tách lệnh hệ thống ↔ nội dung; Phase A không có tool ghi nên rủi ro thấp.
- **Chậm MVP** → Phase A độc lập, có thể làm **song song/sau** khi luồng bán COD đã chạy; không chặn ra mắt.

## 9. Bước tiếp theo
- Chủ shop bắt đầu **soạn kho tri thức FAQ song ngữ** (đầu vào cho AI-2/AI-3) — có thể để **AI soạn nháp EN** từ bản VN, chủ shop duyệt.
- Xác nhận **model Claude cụ thể** (Haiku cho chi phí) và tạo **API key Anthropic**.
- Sau khi duyệt kế hoạch → bắt tay AI-1 → AI-8.
