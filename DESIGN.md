# DESIGN.md — Hệ thống Thiết kế Giao diện DocuMind AI

Tài liệu này quy chuẩn hóa phong cách thiết kế, design tokens, bố cục không gian và thành phần giao diện cho dự án **DocuMind AI**, tuân thủ nguyên tắc kiến trúc của **UI/UX Pro Max** và tiêu chuẩn hoàn thiện của **Impeccable**.

---

## 1. Định vị Phong cách (Style Archetype)

- **Phong cách chủ đạo**: *Modern Minimalist SaaS* kết hợp *Enterprise Clean*.
- **Mục tiêu cảm xúc**: Tin cậy (Trustworthy), Chuyên nghiệp (Professional), Tinh gọn (Clutter-free) và Minh bạch (Transparent).
- **Môi trường sử dụng**: Desktop-first (môi trường văn phòng làm việc tập trung cao độ, màn hình độ phân giải từ 1366px đến 4K), hỗ trợ thích ứng linh hoạt (responsive) cho máy tính bảng và thiết bị di động.

---

## 2. Bảng màu & Design Tokens

### 2.1. Thang màu Trung tính (Neutral Foundation)
Dùng cho nền, khung chia cắt, đường viền và phân cấp nội dung văn bản:

| Token | Light Mode | Dark Mode | Ứng dụng |
| :--- | :--- | :--- | :--- |
| `background` | `#F8FAFC` (`slate-50`) | `#020617` (`slate-950`) | Nền tổng thể trang |
| `surface` | `#FFFFFF` (`white`) | `#0F172A` (`slate-900`) | Thẻ Card, Thanh Sidebar, Khung Chat |
| `surface-subtle`| `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Nền input, hover state, code blocks |
| `border` | `#E2E8F0` (`slate-200`) | `#334155` (`slate-700`) | Đường kẻ phân tách, viền card |
| `text-primary` | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | Tiêu đề, nội dung tin nhắn chính |
| `text-secondary`| `#475569` (`slate-600`) | `#94A3B8` (`slate-400`) | Nhãn phụ, thời gian, mô tả |
| `text-muted` | `#94A3B8` (`slate-400`) | `#64748B` (`slate-500`) | Placeholder, trạng thái vô hiệu |

### 2.2. Màu Thương hiệu & Hành động (Brand & Primary)
- **Primary / Brand**: `#4F46E5` (`indigo-600`), hover `#4338CA` (`indigo-700`), Dark Mode `#6366F1` (`indigo-500`).
- **Accent**: `#8B5CF6` (`violet-500`) điểm xuyết các hiệu ứng AI, gradient banner.
- **Focus Ring**: `ring-2 ring-indigo-500 ring-offset-2 ring-offset-background`.

### 2.3. Màu Trạng thái Ngữ nghĩa (Semantic Status)
- **Tin cậy cao / Đã xác thực (`high` / `INDEXED`)**:
  - Light: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Dark: `dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800`
- **Cần lưu ý / Tự tin trung bình (`medium` / `PROCESSING`)**:
  - Light: `bg-amber-50 text-amber-700 border-amber-200`
  - Dark: `dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800`
- **Cảnh báo / Lỗi / Tự tin thấp (`low` / `FAILED`)**:
  - Light: `bg-rose-50 text-rose-700 border-rose-200`
  - Dark: `dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800`
- **Diễn giải lại câu hỏi (`Rewritten Query`)**:
  - Light: `bg-sky-50 text-sky-700 border-sky-200`
  - Dark: `dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800`

---

## 3. Hệ thống Typography & Nhịp điệu (Rhythm)

- **Font chữ**: Inter hoặc Geist Sans cho văn bản giao diện; JetBrains Mono hoặc `font-mono` cho Code / Markdown Blocks.
- **Thang kích thước & Độ cao dòng**:
  - **Heading 1**: `text-2xl font-bold tracking-tight` (24px, line-height 32px)
  - **Heading 2**: `text-lg font-semibold` (18px, line-height 26px)
  - **Body / Chat Text**: `text-[15px] leading-relaxed` (~24px line-height) — tối ưu để đọc lướt các tài liệu dài.
  - **Metadata / Chips / Badges**: `text-xs font-medium` (12px)
  - **Timestamp / Subtext**: `text-[11px] text-muted-foreground`

---

## 4. Kiến trúc Không gian Module 4 (Split-View Workspace)

Giao diện Module 4 (Hỏi đáp Tri thức & Khung Chat Đối chiếu) được tổ chức theo bố cục 3 cột chuyên biệt:

```
┌──────────────┬──────────────────────────────────────────┬────────────────────────┐
│  SIDEBAR     │            CHAT WORKSPACE                │   CITATION DRAWER      │
│  (Phiên chat)│   (Hội thoại, Streaming SSE, Citations)  │   (Đối chiếu tệp gốc)  │
│              │                                          │                        │
│ [+ New Chat] │  [System] "Hỏi đáp nội bộ DocuMind..."   │ 📄 Quy_che_2026.pdf    │
│              │                                          │ Trang 14 • Độ khớp 94% │
│ - Hôm nay    │  [User]   "Chính sách nghỉ phép ra sao?" │                        │
│   • Quy chế..│  [AI]     "Theo quy định tại [1][2]..."  │ "Đoạn trích dẫn chi    │
│ - 7 ngày     │           🏷️ Trích dẫn: [1] [2]          │  tiết từ văn bản gốc..."│
│              │           👍 👎  📋 Sao chép             │                        │
│              │                                          │ [Tải tệp] [Xem thêm]   │
│              │  [  Nhập câu hỏi...            (Gửi) ]   │                        │
└──────────────┴──────────────────────────────────────────┴────────────────────────┘
```

1. **Sidebar Trái (`w-64` / 256px)**:
   - Nút `+ Cuộc trò chuyện mới` đặt ở vị trí ưu tiên cao nhất.
   - Danh sách phiên chat gom nhóm theo `Hôm nay`, `7 ngày trước`, `Cũ hơn`.
   - Nút xóa và đổi tên phiên chat tiện dụng.
2. **Khu vực Hội thoại Trung tâm (`flex-1`)**:
   - `max-w-4xl` căn giữa cho khoảng đọc văn bản lý tưởng.
   - Tin nhắn người dùng (`User`): Canh phải, nền `indigo-600`, chữ trắng.
   - Tin nhắn trợ lý (`AI Assistant`): Canh trái, nền thẻ card nổi bật nhẹ, hỗ trợ Markdown (bảng, danh sách, in đậm).
   - Thẻ trích dẫn (Citations Chips): Đặt dưới câu trả lời, bấm vào để mở ngay Drawer bên phải.
   - Khung nhập liệu nổi (Sticky Bottom Prompt Bar): Textarea tự co giãn chiều cao theo nội dung gõ.
3. **Ngăn kéo Đối chiếu Trích dẫn (`w-96` / 384px - `w-[420px]`)**:
   - Đóng mở mượt mà (smooth slide-in).
   - Hiển thị tên tệp, số trang, chunk index, điểm tương đồng (Similarity score %).
   - Bôi đậm trích đoạn liên quan (Excerpt).
   - Nút hành động trực tiếp: "Tải xuống tài liệu gốc".

---

## 5. Tiêu chuẩn Hoàn thiện Chi tiết (Impeccable Polish Standards)

1. **Accessibility (A11y)**:
   - Tương phản văn bản đạt tối thiểu **4.5:1** (WCAG AA).
   - Mọi nút bấm icon (Gửi, Dừng, Like, Dislike, Sao chép, Đóng) đều có `aria-label` và `title`.
   - Giữ nguyên `focus-visible:ring-2` khi điều hướng bằng bàn phím.
2. **Phản hồi Tức thì (Instant Feedback)**:
   - Khi bấm "Sao chép câu trả lời": Icon chuyển thành checkmark xanh trong 2 giây.
   - Khi gửi câu hỏi: Con trỏ AI bắt đầu streaming ngay lập tức kèm nút "Dừng tạo phản hồi".
   - Khi bấm Like/Dislike: Màu nút chuyển thành active và lưu trạng thái vào hệ thống.
3. **Trạng thái Biên (Edge Cases)**:
   - **Phiên chat mới**: Hiển thị Empty State với các thẻ gợi ý câu hỏi mẫu thông minh theo phòng ban (HR, Kỹ thuật, Tài chính).
   - **Không tìm thấy tài liệu**: Hiển thị thông báo minh bạch, không bịa đặt, gợi ý người dùng đặt câu hỏi khác hoặc liên hệ Quản trị viên tri thức.

---

## 6. Đặc tả Module 5: Streaming SSE & Trung tâm Đánh giá Tri thức (Feedback Dashboard)

### 6.1. Token Streaming Indicator & Controls
- **Cursor Animation**: `inline-block w-2 h-4 ml-1 bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle rounded-[1px]`.
- **Nút Dừng (Stop Stream)**: Màu `rose-600` hover `rose-700` với icon `Square` (Fill), kích hoạt trạng thái dừng mượt mà và bảo lưu toàn bộ văn bản đã nhận.

### 6.2. Advanced Session Tools
- **Inline Rename**: Click icon bút chì để chuyển tên session thành input field với nút `Check` (Lưu) và `X` (Hủy), hỗ trợ phím `Enter` để lưu nhanh.
- **Export Transcript**: Tạo tệp Markdown sạch sẽ (`.md`) chứa tiêu đề phiên, danh sách câu hỏi - câu trả lời và liên kết trích dẫn nguồn văn bản.
- **Delete Confirmation Modal**: Cảnh báo rõ ràng trước khi xóa vĩnh viễn phiên khỏi cơ sở dữ liệu.

### 6.3. Feedback Modal & Quality Dashboard
- **5 Nhóm lý do góp ý**:
  - `OUTDATED`: Tài liệu đã lỗi thời / hết hiệu lực (`amber`)
  - `INCORRECT`: Thông tin câu trả lời bị sai lệch (`rose`)
  - `INCOMPLETE`: Câu trả lời sơ sài, thiếu ý quan trọng (`purple`)
  - `CITATION_ERROR`: Trích dẫn nhầm số trang / nhầm tệp (`sky`)
  - `OTHER`: Lý do khác (`slate`)
- **Metrics Cards**:
  - Tỷ lệ hài lòng: Thẻ nổi bật với chỉ số % lớn và thanh đo trực quan (Progress bar).
  - Lượt thích (Likes) / Lượt không thích (Dislikes) phân chia màu xanh `emerald` và đỏ `rose` tương phản cao.
- **Bảng rà soát Disliked Answers**: Bảng dữ liệu có phân trang, xem chi tiết câu hỏi, nội dung AI sinh và lý do góp ý của nhân viên để Knowledge Manager xử lý ngay.

