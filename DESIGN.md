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

---

## 7. Đặc tả Module 6: Admin Dashboard & Audit Logs UX Standards

### 7.1. Bố cục Không gian & Phân cấp (Tabbed Layout)
- **Top Header**: Tiêu đề trang "Trung tâm Quản trị Hệ thống & LLMOps", badge vai trò `ADMIN`, nút làm mới dữ liệu (`RefreshCw`) và bộ chọn dải thời gian.
- **Thanh điều hướng Tab (Segmented Control)**:
  - Tab 1: **Chỉ số & Chi phí LLMOps** (`LayoutDashboard`) — Bảng điều khiển tài nguyên, người dùng, tài liệu, token và chi phí.
  - Tab 2: **Nhật ký Kiểm toán (Audit Logs)** (`ShieldAlert`) — Bảng truy vết hành vi người dùng và an toàn thông tin.

### 7.2. Thẻ Chỉ số (KPI Cards & Cost Breakdown)
- **Hệ thống 4 Cards cốt lõi**:
  1. *Người dùng & Phân quyền*: Tổng số, active, breakdown `EMPLOYEE` / `KNOWLEDGE_MANAGER` / `ADMIN`.
  2. *Tài liệu & Lưu trữ*: Tổng số file, dung lượng formatted (MB/GB), tổng vector chunks đang phục vụ truy vấn.
  3. *Hiệu năng Chat RAG*: Tổng câu hỏi, độ trễ trung bình (`avgLatencyMs`), tỷ lệ hài lòng `%`.
  4. *Chi phí AI (LLMOps)*: Số token tổng hợp, chi phí quy đổi USD (\$0.1220) và tiền Việt (VND `₫`), phân tách chi phí Chat (`gpt-4o-mini`) và Embedding (`text-embedding-3-small`).

### 7.3. Bảng Nhật ký Kiểm toán (Audit Logs Explorer)
- **Bộ lọc đa chiều (Filters Bar)**:
  - Input tìm kiếm tức thì theo từ khóa / IP (`Search`).
  - Dropdown lọc theo `action` (Tất cả, QUERY, STREAM_QUERY, UPLOAD_DOCUMENT, DELETE_DOCUMENT, FEEDBACK_LIKE, FEEDBACK_DISLIKE).
  - Nút Reset bộ lọc.
- **Badges phân loại hành động (Action Badges)**:
  - `QUERY` / `STREAM_QUERY`: `bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300`
  - `UPLOAD_DOCUMENT`: `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300`
  - `DELETE_DOCUMENT`: `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300`
  - `FEEDBACK_LIKE`: `bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300`
  - `FEEDBACK_DISLIKE`: `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300`
- **Chi tiết Metadata Modal / Drawer**: Bấm vào log để xem toàn bộ payload JSON, câu hỏi người dùng, kích thước file hoặc lý do phản hồi.
- **Phân trang (Enterprise Pagination)**: Hiển thị "Trang X / Y", tổng số bản ghi, nút Trước / Sau với trạng thái disabled chính xác.

### 7.4. Bảo vệ Quyền hạn & Trạng thái Biên (RBAC Edge Cases)
- **Tài khoản không phải Admin**: Hiển thị màn hình từ chối truy cập (Access Denied) lịch sự kèm nút CTA "Quay về trang chủ" và "Chuyển tới Hỏi đáp".
- **Empty State**: Khi bộ lọc không có log nào thỏa mãn, hiển thị minh họa trực quan và nút "Xóa bộ lọc".

---

## 8. Đặc tả Module 1: Auth & Identity Access Management (IAM) UX Standards

### 8.1. Bố cục Split-Screen Doanh nghiệp (Enterprise Split Layout)
- **Cột Trái (Brand Hero Panel - `w-1/2` trên Desktop)**:
  - Nền gradient cao cấp `from-indigo-950 via-slate-900 to-slate-950`.
  - Logo DocuMind AI nổi bật với hiệu ứng ánh sáng nhẹ (glow effect).
  - Khối trình diễn giá trị (Value Proposition): Tỷ lệ ảo giác $\le 1\%$, trích dẫn chính xác số trang tài liệu nội bộ, bảo mật phân quyền RBAC đa phòng ban.
  - Social Proof / Enterprise Trust Badges: Mã hóa dữ liệu chuẩn AES-256, pgvector HNSW indexing, ISO/IEC 27001 readiness.
- **Cột Phải (Form Container - `w-1/2` trên Desktop, full màn hình trên Mobile)**:
  - Nền sạch sẽ `bg-white dark:bg-slate-900`, căn giữa thẻ đăng nhập/đăng ký.
  - Phân cấp thị giác: Tiêu đề rõ ràng, mô tả phụ, nút SSO Google Workspace và phân cách kẻ ngang tinh tế.

### 8.2. Micro-interactions & Phản hồi Trực quan (Form UX)
- **Google Workspace SSO Button**: Viền `slate-200 dark:border-slate-700`, hover nổi nhẹ, kèm icon Google chuẩn thương hiệu.
- **Demo Role Quick-Switcher**: Thẻ điền nhanh 3 tài khoản mẫu dành cho tester/PO:
  - `Admin`: `admin@documind.vn`
  - `Knowledge Manager`: `km@documind.vn`
  - `Employee`: `user@documind.vn`
- **Password Strength & Policy Meter (Đăng ký)**:
  - Thanh tiến trình 3 cấp độ (Yếu / Khá / Mạnh) đổi màu linh hoạt `rose` $\rightarrow$ `amber` $\rightarrow$ `emerald`.
  - Danh sách checklist 3 tiêu chí: $\ge 6$ ký tự, chứa chữ hoa (A-Z), chứa ký tự đặc biệt (!@#$...).
- **Nút Xem/Ẩn Mật khẩu**: Tích hợp icon `Eye` / `EyeOff` tiện lợi, có `aria-label` và chuyển đổi mượt mà.
- **IT Helpdesk Modal**: Hỗ trợ nhân viên quên mật khẩu liên hệ bộ phận IT nội bộ nhanh chóng.

---

## 9. Đặc tả Module 2: Kho Tài liệu & Ingestion Pipeline UX Standards

### 9.1. Vùng Kéo Thả (Drag & Drop Zone)
- **Viền nét đứt (Dashed Border)**: `border-2 border-dashed border-slate-300 dark:border-slate-800`.
- **Trạng thái kéo tệp vào (DragOver Active)**: Nền `indigo-500/10`, viền `border-indigo-500`, tỷ lệ co giãn nhẹ `scale-[1.005]`.
- **Hỗ trợ định dạng & giới hạn**: Hiển thị rõ danh sách định dạng được hỗ trợ (PDF text-based, DOCX, MD, TXT) và dung lượng tối đa 20MB.

### 9.2. Bảng Danh sách Tài liệu & Nhịp điệu Không gian
- **Hệ thống Biểu tượng Định dạng Tệp**:
  - PDF: Icon màu đỏ `rose-500`
  - DOCX / DOC: Icon màu xanh dương `blue-500`
  - Markdown (.md) / Text (.txt): Icon màu tím `purple-500`
- **Huy hiệu Trạng thái Vòng đời (Lifecycle Status Badges)**:
  - `INDEXED`: `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300` kèm icon `CheckCircle2`.
  - `PROCESSING` / `UPLOADING`: `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300` kèm icon xoay tròn `RotateCw` và hiệu ứng pulse.
  - `FAILED`: `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300` kèm nút **Thử lại (Retry Ingestion)** trực tiếp.
  - `ARCHIVED`: `bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300`.
- **Huy hiệu Mức độ Nhạy cảm (Sensitivity Badges)**:
  - `PUBLIC`: `bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400`
  - `INTERNAL`: `bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400`
  - `CONFIDENTIAL`: `bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400`

### 9.3. Hộp thoại Cấu hình Nạp & Soi Chunks (Inspector Modal)
- **Modal Cấu hình Nạp (Upload Modal)**:
  - Preview tệp đã chọn kèm kích thước định dạng chuẩn.
  - Bộ 3 nút chọn nhanh cấp độ bảo mật (Sensitivity).
  - Dropdown chọn phòng ban áp dụng (Department Assignment).
  - Danh sách nút chọn vai trò truy cập (Allowed Roles).
  - Ô nhập thẻ nhãn (Tags) phân loại.
  - Thanh đo tiến trình tải lên với % trực quan.
- **Trình Soi Chunks (Chunk Inspector)**:
  - Tìm kiếm nội dung tức thì bên trong các chunks.
  - Thẻ chunk hiển thị số thứ tự, số trang, token count và mã font monospace rõ nét.
  - Nút sao chép nội dung chunk một chạm kèm phản hồi checkmark xanh trong 2 giây.
- **Hộp thoại Xác nhận Xóa (Delete Dialog)**:
  - Cảnh báo rõ ràng trước khi xóa vĩnh viễn tài liệu và dọn dẹp các vector liên quan trong pgvector.

---

## 10. Đặc tả Module 3: Trung tâm Giám sát Hàng đợi & Ingestion Pipeline (BullMQ Queue & RAG Worker Monitor)

### 10.1. Sơ đồ 5 Giai đoạn Pipeline & Tokens Chỉ báo (5-Stage Visualizer Flow)
Mỗi tác vụ nạp tri thức RAG ngầm trải qua 5 chặng tuần tự. Giao diện thể hiện dòng chảy này bằng các nút tiến trình (Stepped Nodes) kèm đường nối (Connectors) có hiệu ứng hoạt họa:
1. **STORAGE & PRE-VALIDATION** (`Storage`): Xác thực MIME type, quét virus/dung lượng $\le 20$MB, lưu trữ blob vào MinIO/S3.
   - Active: `border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300` kèm icon `Database`.
2. **PARSING** (`Parser`): PDF (giữ nguyên page number), DOCX (giữ nguyên heading hierarchy), Markdown (giữ nguyên table markup).
   - Active: `border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300` kèm icon `FileCode`.
3. **SMART CHUNKING** (`Chunker`): Cắt đoạn 800 tokens, 100 tokens overlap, table-preserving logic chống đứt gãy dữ liệu bảng.
   - Active: `border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300` kèm icon `Scissors` / `Layers`.
4. **BATCH EMBEDDING** (`Embedding`): Batching tối đa 100 chunks/lần gọi đến OpenAI `text-embedding-3-small` (1536 dims).
   - Active: `border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300` kèm icon `Sparkles`.
5. **PGVECTOR INDEXING** (`Indexing`): Ghi vector chunks vào PostgreSQL pgvector, index HNSW/IVFFlat, gắn siêu dữ liệu RBAC.
   - Completed: `border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300` kèm icon `CheckCircle2`.

### 10.2. Thẻ Thống kê Sức khỏe Hàng đợi & Worker Metrics (Queue Health Cards)
- **Hệ thống 5 Thẻ Trạng thái Tác vụ BullMQ**:
  - `Active Jobs`: Màu xanh dương `sky-500` kèm icon `Activity` và hiệu ứng ping khi có job đang chạy.
  - `Waiting Jobs`: Màu hổ phách `amber-500` kèm icon `Clock` đếm số tài liệu trong hàng đợi chờ xử lý.
  - `Completed Jobs`: Màu xanh lá `emerald-500` kèm icon `CheckCircle2` thống kê tổng số tài liệu nạp thành công.
  - `Failed Jobs`: Màu đỏ `rose-500` kèm icon `AlertTriangle` cảnh báo các job cần retry hoặc điều chỉnh tài liệu.
  - `Delayed Jobs`: Màu xám `slate-500` kèm icon `PauseCircle` các tác vụ đang tạm dừng trong khoảng backoff.
- **Thẻ Hiệu năng Worker (Worker Throughput & Latency)**:
  - Trạng thái Worker: `ACTIVE` (`bg-emerald-500/10 text-emerald-600 border-emerald-500/30`) hoặc `IDLE` (`bg-slate-500/10 text-slate-500`).
  - Tốc độ nạp trung bình: `~12 docs/min` hoặc `~45 chunks/s`.
  - Độ trễ bóc tách & embed trung bình (`Avg Ingestion Time`): ví dụ `1.8s/file`.
  - Tỷ lệ thành công: Thanh phần trăm (Success Rate %) trực quan đạt $\ge 98\%$.

### 10.3. Bảng Khảo sát Tác vụ Ingestion (Jobs Explorer Table)
- **Cấu trúc Bảng Chuyên biệt**:
  - `Tài liệu & Định dạng`: Tên file (kèm tooltip tên đầy đủ), icon định dạng, phòng ban phụ trách, kích thước và số trang.
  - `Tiến trình Pipeline 5 Chặng`: Hiển thị thanh tiến trình 5 nodes mini hoặc badge giai đoạn hiện tại (`STORAGE` $\rightarrow$ `PARSER` $\rightarrow$ `CHUNKING` $\rightarrow$ `EMBEDDING` $\rightarrow$ `INDEXING`).
  - `Số lần Thử lại (Attempts)`: Huy hiệu `1/3`, `2/3` hoặc `3/3 (Max)` với màu cảnh báo tương ứng.
  - `Thời gian Thực thi (Duration)`: Đo bằng mili-giây hoặc giây (ví dụ: `1,240 ms`).
  - `Trạng thái & Hành động`:
    - Nút **Thử lại (Retry Job)**: Icon `RotateCw` kích hoạt đưa lại job vào BullMQ ngay lập tức.
    - Nút **Soi Chunks (View Chunks)**: Mở drawer xem chi tiết từng chunk đã bẻ.
    - Nút **Chi tiết Lỗi (View Error)**: Khi job thất bại, mở modal xem chi tiết exception và lý do.

### 10.4. Thanh Thao tác Hàng loạt & Tự động Thăm dò (Bulk Queue Actions & Polling)
- **Công cụ Thao tác Hàng loạt**:
  - Nút `Thử lại tất cả job lỗi` (`RotateCw`): Tự động duyệt qua toàn bộ danh sách `FAILED` và gửi yêu cầu retry lên backend.
  - Nút `Dọn dẹp hàng đợi lỗi` (`Trash2`): Đánh dấu hoàn tất dọn dẹp các bản ghi lỗi cũ.
  - Toggle `Tự động cập nhật (Live Auto-polling 3.5s)`: Cho phép bật/tắt chế độ tự động làm mới trạng thái tác vụ.
- **Thanh Lọc Đa tiêu chí**:
  - Ô tìm kiếm tên tài liệu tức thì.
  - Dropdown lọc trạng thái: `Tất cả`, `Đang chạy (ACTIVE)`, `Đang chờ (WAITING)`, `Hoàn tất (COMPLETED)`, `Thất bại (FAILED)`.
  - Dropdown lọc phòng ban nghiệp vụ.

### 10.5. Modal Stacktrace Lỗi & Trình Soi Chunks (Error Inspector & Retry Dialog)
- **Error Inspector Modal**:
  - Hiển thị tên tài liệu lỗi, thời gian xảy ra lỗi, số lần đã thử lại.
  - Khung code box chứa chi tiết Stacktrace / Error Message với giao diện tối màu `bg-slate-900 text-rose-300 font-mono text-xs p-4 rounded-xl`.
  - Nút copy thông báo lỗi và nút "Thử lại ngay".
- **Chunk Inspector Drawer**:
  - Hiển thị danh sách chunks đã lưu trong pgvector.
  - Token count, page index, chunk index.
  - Bộ tìm kiếm từ khóa bên trong các chunks.
  - Nút sao chép nội dung chunk với phản hồi tick xanh trong 2 giây.




