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
  - Trò chuyện & Tra cứu: Hỏi đáp đa lượt (Multi-turn Chat với Query Rewriting), Streaming phản hồi từng ký tự qua Server-Sent Events (SSE), hiển thị nguồn trích dẫn (Citations) chính xác kèm trích đoạn gốc, đánh giá câu trả lời (Like/Dislike feedback).
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

