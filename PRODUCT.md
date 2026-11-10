# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Nhân viên / Người dùng cuối (Employee / End User)**: Nhân viên mới cần onboarding, kỹ sư tra cứu runbook/SOP, nhân sự các phòng ban cần tìm kiếm quy chế, chính sách nội bộ nhanh chóng trong lúc làm việc mà không phải đọc thủ công qua hàng chục trang tài liệu.
- **Quản trị viên tri thức (Knowledge Manager / Team Lead)**: Trưởng phòng ban, thư ký dự án hoặc người phụ trách tài liệu; cần không gian trực quan để tải lên tài liệu (PDF, Word, Markdown), gắn nhãn phòng ban, thiết lập phân quyền truy cập và quản lý vòng đời tài liệu.
- **Quản trị viên hệ thống (System Administrator / DevOps)**: Theo dõi hoạt động hệ thống, kiểm soát chi phí token, mức độ tiêu thụ tài nguyên và rà soát nhật ký kiểm toán (Audit Logs).

## Product Purpose

DocuMind AI là nền tảng RAG & Trợ lý Tra cứu Tri thức Nội bộ dành cho doanh nghiệp, giải quyết triệt để vấn đề thất lạc tri thức và lãng phí thời gian tra cứu tài liệu rải rác. Thành công được định nghĩa bằng:
1. Giảm thời gian tìm kiếm câu trả lời chính xác từ 15–20 phút xuống còn dưới 5 giây.
2. Đảm bảo độ tin cậy tuyệt đối: câu trả lời luôn có bằng chứng trích dẫn cụ thể (tên file, số trang, đoạn trích) và tỷ lệ ảo giác (hallucination) $\le 1\%$.
3. Bảo vệ dữ liệu nhạy cảm giữa các phòng ban thông qua cơ chế phân quyền tài liệu nghiêm ngặt.

## Positioning

Khác với các công cụ tìm kiếm từ khóa truyền thống (dễ bỏ sót từ đồng nghĩa) hoặc ChatGPT thông thường (thiếu dữ liệu nội bộ và có nguy cơ rò rỉ dữ liệu mật), DocuMind AI kết hợp Hybrid Search (ngữ nghĩa Vector pgvector + từ khóa chính xác FTS) với cơ chế Document-level RBAC Metadata Filtering. Nhân viên chỉ truy vấn được đúng phạm vi tài liệu mà vai trò của họ được phép xem.

## Operating Context

- **Môi trường sử dụng**: Doanh nghiệp tại Việt Nam; sử dụng ngôn ngữ tiếng Việt tự nhiên trong cả giao tiếp chat và tài liệu nghiệp vụ (quy chế, SOP, hợp đồng, quyết định).
- **Thiết bị**: Desktop-first. Được tối ưu hóa cho màn hình máy tính làm việc của nhân viên văn phòng với bố cục split-view (khung chat tương tác song song với drawer/panel trích dẫn tài liệu gốc), có hỗ trợ responsive cơ bản cho máy tính bảng và điện thoại.
- **Tài liệu nạp vào**: PDF (text-based), Microsoft Word (.docx), Markdown (.md), Text (.txt), tối đa 20MB/file.

## Capabilities and Constraints

- **Capabilities**:
  - Xác thực người dùng qua JWT và Google SSO OAuth2.
  - Phân quyền theo vai trò (RBAC): `EMPLOYEE`, `KNOWLEDGE_MANAGER`, `ADMIN`.
  - Quản lý tài liệu: Tải lên kéo thả, theo dõi trạng thái xử lý bất đồng bộ (`UPLOADING`, `PROCESSING`, `INDEXED`, `FAILED`, `ARCHIVED`, `DELETED`), gắn thẻ và gán phòng ban.
  - Giám sát hàng đợi nạp ngầm & Soi Chunks (Module 3): Giám sát trạng thái Pipeline thời gian thực (Storage → Parser → Chunking → Batch Embedding → pgvector Indexing), kiểm tra cấu trúc từng đoạn văn bản đã bẻ (Chunk Inspector: token count, page index, nội dung trích xuất), và cơ chế kích hoạt thử lại (Retry Ingestion) cho các tệp thất bại.
  - **Trò chuyện Đa lượt & Tra cứu Tri thức Split-view (Module 4 Frontend - Chat & Retrieval Workspace)**:
    - **Quản lý Phiên trò chuyện (Multi-turn Sessions)**: Danh sách phiên hỏi đáp theo dòng thời gian (Hôm nay, 7 ngày trước, Cũ hơn), tạo phiên mới (`New Chat`), đổi tên chủ đề hội thoại và xóa phiên.
    - **Hội thoại Đa lượt thông minh (Query Rewriting Feedback)**: Hiển thị minh bạch câu hỏi đã được viết lại (Rewritten Query) để người dùng hiểu AI đã xâu chuỗi ngữ cảnh trước đó ra sao.
    - **Streaming SSE thời gian thực (Real-time Token Streaming)**: Phản hồi gõ chữ từng ký tự mượt mà kèm con trỏ nhấp nháy, hỗ trợ nút "Dừng tạo phản hồi" (Stop Generating).
    - **Trình bày Markdown Phong phú**: Hỗ trợ hiển thị bảng biểu, danh sách gạch đầu dòng/đánh số, code block kèm nút sao chép nhanh, blockquote và in đậm thuật ngữ chuyên môn.
    - **Hệ thống Nguồn trích dẫn Đối chiếu (Interactive Citations & Split-view Drawer)**:
      - Mỗi câu trả lời đính kèm danh sách thẻ trích dẫn (Citation chips) với tên tài liệu, số trang, điểm tương đồng.
      - Click vào chip sẽ kích hoạt ngay ngăn kéo đối chiếu (Citation Drawer / Split-view Panel) bên phải màn hình để đọc trích đoạn gốc (excerpt) và mở tải tệp gốc đối chiếu song song mà không làm gián đoạn luồng chat.
    - **Đánh giá & Kiểm soát Chất lượng (Feedback Loop)**: Like/Dislike từng câu trả lời kèm modal thu thập phản hồi (thông tin sai lệch, tài liệu lỗi thời, câu trả lời thiếu ý).
    - **Tiện ích Công sở (Office Ergonomics)**: Gợi ý câu hỏi mẫu thông minh theo phòng ban (HR, Kỹ thuật, Tài chính), tự động giãn khung nhập liệu (Auto-expanding Textarea), phím tắt `Enter` gửi và `Shift + Enter` xuống dòng.
  - **Module 5 Frontend: Streaming SSE Thời gian thực, Quản lý Phiên Nâng cao & Feedback Analytics Dashboard**:
    - **Kết nối SSE Trực tiếp (Native Server-Sent Events)**: Sử dụng luồng đọc `ReadableStream` nhận dữ liệu theo giao thức SSE từ `POST /api/v1/chat/query/stream`, đẩy từng token tức thì về giao diện với độ trễ thấp (<100ms), tự động ngắt khi nhấn nút Dừng.
    - **Quản trị Phiên Hội thoại Chuyên sâu (Advanced Session Tools)**:
      - Đổi tên phiên trực tiếp (Inline Rename) bằng phím `Enter` / nút checkmark.
      - Xóa phiên với hộp thoại xác nhận (Confirmation Dialog) bảo vệ người dùng tránh xóa nhầm dữ liệu.
      - Xuất tóm tắt phiên làm việc (Export Transcript sang tệp Markdown / `.txt`) để gửi email báo cáo hoặc đính kèm biên bản công việc.
    - **Trung tâm Giám sát Đánh giá Tri thức (Feedback & Knowledge Quality Dashboard)**:
      - Thống kê tỷ lệ hài lòng thời gian thực: % Hài lòng, Tổng số câu trả lời, Lượt Thích / Không thích.
      - Bảng phân tích câu trả lời bị phản hồi tiêu cực (Disliked Answers Review Table) dành riêng cho Knowledge Manager: hiển thị chi tiết câu hỏi, nội dung AI sinh, lý do phân loại (sai lệch, lỗi thời, thiếu ý), người phản hồi và liên kết đối chiếu tài liệu nguồn để kịp thời bổ sung, sửa đổi tài liệu.
      - Modal phản hồi chi tiết 5 nhóm lý do khi người dùng bấm Dislike câu trả lời.
  - Quản trị: Xem thống kê tổng lượng token tiêu thụ, chi phí ước tính, và danh sách nhật ký kiểm toán (Audit Logs).
- **Constraints**:
  - Không tự suy đoán thông tin ngoài ngữ cảnh tài liệu nội bộ được cung cấp.
  - Xử lý nạp tài liệu nặng chạy ngầm qua Background Queue (BullMQ) để không chặn luồng HTTP API.

## Brand Commitments

- **Tên sản phẩm**: DocuMind AI
- **Phong thái (Voice & Tone)**: Chuyên nghiệp, tin cậy, chính xác, khách quan và minh bạch về nguồn gốc thông tin.

## Evidence on Hand

- Đặc tả nghiệp vụ và kiến trúc kỹ thuật chi tiết tại `documind-api/docs/Nghiệp vụ.md`.
- Backend API NestJS hoàn chỉnh với Prisma ORM, PostgreSQL pgvector và Redis tại `documind-api`.
- Giao diện người dùng Next.js App Router với Tailwind CSS tại `documind-web`.

## Product Principles

1. **Minh bạch và Có căn cứ (Grounded Authority)**: Mọi câu trả lời của AI phải có nguồn trích dẫn rõ ràng đến từng trang tài liệu; nói "Không tìm thấy" khi tài liệu không đề cập thay vì tự suy diễn.
2. **Bảo mật theo chiều sâu (Zero-Leak RBAC)**: Phân quyền tài liệu được thực thi nghiêm ngặt ngay tại tầng truy vấn dữ liệu (Metadata Pre-filtering), đảm bảo phòng ban này không thể vô tình hay hữu ý truy xuất tài liệu mật của phòng ban khác.
3. **Hiệu năng và Tức thì (Realtime Responsiveness)**: Trải nghiệm hỏi đáp phải nhanh chóng qua Streaming SSE; các tác vụ phân tích tài liệu nặng phải được xử lý bất đồng bộ mà không làm chậm nhịp làm việc của người dùng.
4. **Tiện dụng trong bối cảnh công sở (Office Ergonomics)**: Thiết kế tập trung vào sự thuận tiện của nhân viên văn phòng trên màn hình máy tính: đối chiếu thông tin dễ dàng, thao tác một cú click để xem lại trang tài liệu gốc.

## Accessibility & Inclusion

- Giao diện hỗ trợ chuẩn tương phản WCAG AA, phông chữ tiếng Việt rõ ràng, dễ đọc trong môi trường làm việc văn phòng kéo dài.

