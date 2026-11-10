# AGENTS.md — Hướng dẫn Vận hành & Phối hợp Skills cho DocuMind AI

Tài liệu này đóng vai trò là **kim chỉ nam (System Guide)** cho các AI Agent (Antigravity, Claude Code, Cursor, Codex...) và lập trình viên khi tham gia phát triển dự án **DocuMind AI** (Enterprise RAG & Internal Knowledge Assistant).

---

## 1. Tổng quan Kiến trúc & Ngăn xếp Công nghệ

- **Sản phẩm**: [DocuMind AI](file:///d:/Workspace/Projects/documind-app/PRODUCT.md) — Nền tảng tra cứu tri thức nội bộ & trợ lý AI cho doanh nghiệp.
- **Frontend (`documind-web`)**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons.
- **Backend (`documind-api`)**: NestJS, Prisma ORM, PostgreSQL + pgvector, BullMQ + Redis, SSE Streaming.
- **Đối tượng người dùng**: Nhân viên văn phòng tra cứu SOP/quy chế, Quản trị viên tri thức (Knowledge Manager), Admin hệ thống.
- **Đặc trưng giao diện**: Desktop-first (tối ưu không gian làm việc văn phòng, bố cục split-view đối chiếu tài liệu trích dẫn), chuyên nghiệp, tin cậy, rõ ràng.

---

## 2. Phân công Vai trò 2 Bộ Skills

Dự án tích hợp 2 bộ skill thiết kế mạnh mẽ bổ trợ cho nhau:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UI/UX PRO MAX (Architect)                       │
│  - Tra cứu Design System, Style (Clean SaaS / Enterprise / Minimal)   │
│  - Chọn Bảng màu (Color Palettes), Font Pairings, Chart guidelines     │
│  - Quy chuẩn Stack Next.js + Tailwind CSS + shadcn/ui                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Kế thừa Tokens & Style
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          IMPECCABLE (Craftsman)                        │
│  - Đánh giá phản biện (Critique), Audit khả năng tiếp cận (A11y)       │
│  - Trau chuốt chi tiết (Polish): spacing, contrast WCAG AA, typography │
│  - Xử lý trạng thái biên: Loading, Empty, Error, Micro-interactions    │
└────────────────────────────────────────────────────────────────────────┘
```

| Tiêu chí | `ui-ux-pro-max` (Kiến trúc sư) | `impeccable` (Nghệ nhân hoàn thiện) |
| :--- | :--- | :--- |
| **Bản chất** | Kho dữ liệu tri thức thiết kế đồ sộ (Database & Rules) | Phương pháp luận trau chuốt & chuẩn mực chất lượng sản phẩm |
| **Vị trí trong luồng** | **Khởi đầu (Step 1 - 2)**: Định hình phong cách, màu sắc, font, layout, tokens | **Hoàn thiện (Step 3 - 4)**: Soi xét từng pixel, hierarchy, contrast, trạng thái lỗi |
| **Thế mạnh** | - 80 UI styles, 192 product palettes<br>- 74 font pairings, 120 UX rules<br>- Tích hợp sub-skills: `ui-styling`, `design-system`, `brand`, `banner-design` | - Bắt lỗi UI cẩu thả, nghiệp dư<br>- Audit contrast, focus ring, keyboard nav<br>- Viết copy UX chuẩn chỉ, tinh tế |

---

## 3. Quy trình 4 Bước Phát triển Giao diện Chuẩn

Khi tạo trang mới, component mới hoặc nâng cấp giao diện, Agent **bắt buộc** tuân thủ quy trình 4 bước sau:

### Bước 1: Khởi tạo & Định vị phong cách (`ui-ux-pro-max`)
- Xác định mục tiêu theo [PRODUCT.md](file:///d:/Workspace/Projects/documind-app/PRODUCT.md): B2B Enterprise Knowledge Assistant.
- Chọn bảng màu và style phù hợp qua `ui-ux-pro-max`:
  - **Phong cách gợi ý**: *Modern Minimalist SaaS* hoặc *Enterprise Clean*.
  - **Bảng màu**: Nền trung tính dịu mắt (`slate` / `zinc`), màu thương hiệu xanh tin cậy (`blue` / `indigo`), điểm nhấn trạng thái rõ ràng (Success: `emerald`, Warning: `amber`, Error: `rose`).
  - **Font**: Inter, Geist, hoặc Plus Jakarta Sans kết hợp font tiếng Việt sắc nét.

### Bước 2: Triển khai Component với Stack Chuẩn (`ui-styling` + shadcn/ui)
- Sử dụng các primitive của **shadcn/ui** (Dialog, Sheet, Dropdown, Table, Tabs, Tooltip, Avatar, Badge).
- Viết Tailwind CSS với semantic variables (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`).
- Dùng **Lucide React** làm biểu tượng đồng nhất (không dùng emoji làm icon chức năng).

### Bước 3: Đánh giá phản biện & Tinh chỉnh chi tiết (`impeccable`)
- Kích hoạt tư duy của `impeccable` để rà soát:
  - **Visual Hierarchy**: Yếu tố quan trọng nhất (khung chat, câu trả lời AI, nút bấm chính) có nổi bật tự nhiên không?
  - **Spacing & Rhythm**: Khoảng cách có tuân theo thang chuẩn `4px` / `8px` (`p-4`, `gap-3`, `space-y-4`) không?
  - **Trạng thái biên (Edge Cases)**:
    - Đã có Skeleton/Spinner khi streaming SSE hoặc tải dữ liệu chưa?
    - Khi danh sách tài liệu trống, giao diện Empty State có thân thiện kèm CTA tải lên không?
    - Khi API lỗi hoặc file hỏng, Error Message có đặt gần ngữ cảnh và giải thích rõ ràng không?

### Bước 4: Kiểm tra Danh sách Bàn giao (Pre-Delivery Checklist)
Trước khi coi một giao diện là hoàn thành, kiểm tra:
1. [ ] **Accessibility**: Tương phản văn bản đạt tối thiểu **4.5:1** (WCAG AA). Mọi nút icon có `aria-label`.
2. [ ] **Focus State**: Giữ nguyên `focus-visible:ring-2` cho người dùng điều hướng bàn phím.
3. [ ] **Cursor**: Mọi phần tử click được đều có `cursor-pointer`.
4. [ ] **Responsive & Overflow**: Không bị tràn ngang màn hình (`overflow-x-hidden`).
5. [ ] **Nhãn & Tràn chữ**: Badge, Tag, tên tài liệu dài có `truncate` và Tooltip khi cần.

---

## 4. Prompt Mẫu Cho Lập trình viên

### Tình huống 1: Thiết kế trang mới từ đầu
> *"Hãy áp dụng `ui-ux-pro-max` để thiết kế bố cục cho trang Document Management của DocuMind. Yêu cầu: Bảng danh sách tài liệu, thanh filter phòng ban, nút tải lên kéo thả và thanh trạng thái xử lý background queue."*

### Tình huống 2: Trau chuốt component đã có
> *"Dùng `impeccable` để review và polish lại component Chat Message: tối ưu phần hiển thị trích dẫn (Citations), copy câu trả lời, feedback like/dislike và hiệu ứng loading khi streaming."*

### Tình huống 3: Kiểm toán toàn diện (Audit UX/A11y)
> *"Thực hiện audit theo tiêu chuẩn kết hợp giữa `impeccable` và `ui-ux-pro-max` cho form đăng nhập / upload tài liệu: kiểm tra focus ring, validation errors, contrast và touch/click targets."*

---

## 5. Danh mục Tham chiếu Nhanh trong Thư mục `.agent/skills/`

- **Core UI/UX Intelligence**: [`.agent/skills/ui-ux-pro-max/SKILL.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/ui-ux-pro-max/SKILL.md)
  - Quy tắc chuyên sâu: [`.agent/skills/ui-ux-pro-max/references/pro-rules.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/ui-ux-pro-max/references/pro-rules.md)
  - 120 nguyên tắc UX: [`.agent/skills/ui-ux-pro-max/references/quick-reference.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/ui-ux-pro-max/references/quick-reference.md)
- **Review & Polish**: [`.agent/skills/impeccable/SKILL.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/impeccable/SKILL.md)
- **Styling với shadcn/ui + Tailwind**: [`.agent/skills/ui-styling/SKILL.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/ui-styling/SKILL.md)
- **Hệ thống Design Token**: [`.agent/skills/design-system/SKILL.md`](file:///d:/Workspace/Projects/documind-app/.agent/skills/design-system/SKILL.md)
- **Đặc tả Sản phẩm**: [`PRODUCT.md`](file:///d:/Workspace/Projects/documind-app/PRODUCT.md)

