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
  - **Module 1 Frontend: Xác thực Doanh nghiệp & Phân quyền Truy cập (Enterprise Auth & RBAC)**:
    - **Giao diện Split-Screen Doanh nghiệp (Desktop-first Split Layout)**: Phía bên trái là không gian truyền tải giá trị cốt lõi của DocuMind AI (Bảo mật tài liệu nội bộ, trích dẫn có căn cứ, tỷ lệ ảo giác $\le 1\%$, đối chiếu trang gốc); phía bên phải là khung biểu mẫu đăng nhập/đăng ký tinh gọn, trực quan.
    - **Đăng nhập Đa phương thức (Multi-method Authentication)**: Hỗ trợ đăng nhập một chạm qua Google Workspace SSO (OAuth2 chuẩn doanh nghiệp) và tài khoản Email + Mật khẩu công ty.
    - **Thanh Chọn Nhanh Tài khoản Mẫu (Demo Role Quick-Switcher)**: Cho phép chuyên viên đánh giá / lập trình viên điền nhanh thông tin tài khoản mẫu cho 3 vai trò: `Nhân viên (Employee)`, `Quản lý Tri thức (Knowledge Manager)`, và `Quản trị viên (Admin)` mà không cần nhập tay.
    - **Tiêu chuẩn Bảo mật Mật khẩu Thời gian thực (Live Password Policy Validation)**: Kiểm tra tức thì các điều kiện bảo mật (tối thiểu 6 ký tự, có chữ hoa A-Z, có ký tự đặc biệt) kèm thang đo độ mạnh mật khẩu và icon xác nhận trực quan.
    - **Hộp thoại Hỗ trợ Quên Mật khẩu (IT Helpdesk Modal)**: Hướng dẫn nhân viên liên hệ Quản trị viên CNTT hoặc quy trình cấp lại thông tin truy cập bảo mật.
    - **Xử lý Chuyển hướng Google OAuth2 Callback**: Hoạt ảnh tải mượt mà, tự động giải mã JWT payload và lưu trữ phiên làm việc an toàn trong `localStorage`.
  - Phân quyền theo vai trò (RBAC): `EMPLOYEE`, `KNOWLEDGE_MANAGER`, `ADMIN`.
  - **Module 2 Frontend: Quản lý Kho Tài liệu & Ingestion Pipeline Workspace (Document Management)**:
    - **Vùng Kéo Thả Trực Quan (Interactive Drag & Drop Upload Zone)**: Hỗ trợ kéo thả hoặc duyệt tệp từ máy tính, tự động kiểm tra định dạng hợp lệ (PDF text-based, DOCX, Markdown, Text) và kiểm soát dung lượng tối đa 20MB.
    - **Cấu hình Nạp Tài liệu Toàn diện (Document Ingestion Modal)**:
      - Thiết lập 3 cấp độ bảo mật nhạy cảm: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`.
      - Phân quyền truy cập RBAC theo vai trò (`EMPLOYEE`, `KNOWLEDGE_MANAGER`, `ADMIN`).
      - Gán phòng ban chuyên môn chịu trách nhiệm áp dụng (`departmentId`).
      - Nhập và hiển thị danh sách thẻ Tags phân loại danh mục nghiệp vụ.
      - Thanh đo tiến trình tải lên thời gian thực (`Upload Progress Bar` với %).
    - **Bảng Quản trị Vòng đời Tài liệu Chuyên nghiệp**:
      - Phân cấp thông tin rõ ràng: Tên tệp, icon loại file, số trang, kích thước định dạng chuẩn (KB/MB), ngày tạo.
      - Huy hiệu trạng thái thời gian thực (`INDEXED`, `PROCESSING` kèm hiệu ứng ping, `FAILED`, `ARCHIVED`).
      - Nút **Soi Chunks (Chunk Inspector)** hiển thị số lượng chunks và mở drawer xem chi tiết từng đoạn văn bản kèm số trang và token count.
      - Thao tác nhanh: Tải xuống tệp gốc, Kích hoạt thử lại (Retry Ingestion) cho tệp lỗi, và Xóa tài liệu kèm Hộp thoại xác nhận an toàn (Confirmation Dialog).
    - **Thanh Công cụ Lọc Đa Chiều & Tìm kiếm**: Lọc tức thì theo từ khóa, trạng thái xử lý, cấp độ bảo mật và phòng ban.
    - **Đồng bộ Tự động Hàng đợi Ngầm (Silent Live Auto-polling)**: Tự động cập nhật tiến độ nạp ngầm mỗi 3.5 giây khi có tệp đang ở trạng thái `PROCESSING` hoặc `UPLOADING` mà không gây giật lag giao diện.
  - **Module 3 Frontend: Trung tâm Giám sát Hàng đợi & Pipeline Nạp Tri thức RAG (Ingestion Pipeline Workspace)**:
    - **Sơ đồ Trực quan Dòng chảy Pipeline (5-Stage Visualizer Flow)**: Trình diễn dòng chảy dữ liệu nạp ngầm qua 5 chặng cốt lõi:
      1. *Storage & Validation*: Xác thực định dạng và tải tệp từ MinIO/Local storage.
      2. *Specialized Parser*: Bóc tách văn bản chuẩn hóa (PDF bảo toàn số trang, DOCX bóc tách cấu trúc, Markdown bảo toàn bảng biểu).
      3. *Table-preserving Chunker*: Bẻ đoạn văn bản 800 tokens với overlap 100 tokens, đảm bảo không cắt gãy giữa hàng bảng biểu Markdown.
      4. *Batch Embedding*: Gọi OpenAI `text-embedding-3-small` (1536 chiều, batching tối đa 100 đoạn/lần) tối ưu chi phí và độ trễ.
      5. *pgvector Indexing*: Lưu trữ vector embeddings kèm Metadata RBAC (`allowed_roles`, `department_id`, `sensitivity_level`) và đánh chỉ mục HNSW/IVFFlat.
    - **Bảng Thống kê Sức khỏe Hàng đợi BullMQ (Queue Health & Worker KPI Cards)**:
      - 5 Thẻ chỉ số trạng thái tác vụ hàng đợi: `Active` (đang xử lý), `Waiting` (đang xếp hàng), `Completed` (hoàn tất thành công), `Failed` (thất bại), `Delayed` (tạm hoãn).
      - Thẻ đo hiệu năng Worker: Trạng thái Worker (`ACTIVE` / `IDLE`), Tốc độ xử lý (Docs/phút, Chunks/giây), Thời gian xử lý trung bình (`avgIngestionTimeMs`), Tỷ lệ thành công (Success Rate %).
    - **Trình Thám hiểm Tác vụ Nạp Ngầm (Ingestion Tasks Explorer Table)**:
      - Bảng dữ liệu tác vụ thời gian thực: Tên tài liệu, icon định dạng, phòng ban, dung lượng, thanh tiến trình Pipeline 5 chặng với chỉ báo màu sắc trực quan, số lần thử lại (Attempts 1/3, 2/3), thời gian xử lý (Duration).
      - Bộ lọc đa chiều: Tìm kiếm theo tên file, lọc theo trạng thái (`ACTIVE`, `WAITING`, `COMPLETED`, `FAILED`), lọc theo phòng ban.
      - Thao tác nhanh trên từng tác vụ: "Thử lại ngay" (Retry Job), "Soi Chunks" (Chunk Inspector), và "Chi tiết lỗi & Stacktrace" (Error Modal).
    - **Công cụ Quản trị Hàng đợi Nhanh (Bulk Queue Actions)**:
      - Nút "Thử lại tất cả job thất bại" (Retry All Failed) 1-click.
      - Nút "Dọn dẹp hàng đợi lỗi" (Clear Failed Queue).
      - Công tắc "Tự động làm mới thời gian thực" (Live Auto-polling 3.5s toggle).
    - **Trình Soi Chunks Chuyên sâu (Chunk Inspector Drawer)**:
      - Cho phép kiểm tra danh sách chunks của tài liệu vừa nạp xong: số trang gốc, độ dài token, nội dung chunk với phông chữ monospace rõ nét, tìm kiếm nhanh nội dung trong chunk, và nút sao chép 1-chạm.
    - **Bảo vệ Phân quyền RBAC**:
      - Dành riêng cho Quản trị viên (`ADMIN`) và Quản lý Tri thức (`KNOWLEDGE_MANAGER`). Người dùng vai trò `EMPLOYEE` được hiển thị màn hình thông báo phân quyền thân thiện kèm CTA quay về trang Hỏi đáp Tri thức.
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
  - **Module 6 Backend: Admin Module, Quản trị Hệ thống, Kiểm soát Chi phí AI & Audit Logs**:
    - **Tổng hợp Chỉ số Hệ thống Toàn diện (System Metrics & LLMOps Overview)**:
      - Người dùng: Tổng số tài khoản, người dùng hoạt động/vô hiệu, phân loại vai trò (`EMPLOYEE`, `KNOWLEDGE_MANAGER`, `ADMIN`).
      - Tài liệu & Lưu trữ: Thống kê trạng thái vòng đời tài liệu (`UPLOADING`, `PROCESSING`, `INDEXED`, `FAILED`, `ARCHIVED`, `DELETED`), tổng dung lượng lưu trữ (MB/GB), tổng số vector chunks.
      - Tương tác & Trò chuyện: Tổng số phiên chat, tin nhắn, độ trễ trung bình (`avgLatencyMs`), chỉ số hài lòng phản hồi (% Like/Dislike).
      - Quản lý Token & Chi phí AI ước tính: Tách biệt token chat (`gpt-4o-mini`) và token embedding (`text-embedding-3-small`), quy đổi chi phí theo USD và VND (tỷ giá 25.400 ₫/USD).
    - **Truy xuất & Lọc Nhật ký Kiểm toán (Audit Logs Query Engine)**:
      - Endpoint phân trang chuẩn Enterprise (`page`, `limit`).
      - Lọc theo hành động (`action`), loại tài nguyên (`resourceType`), định danh người dùng (`userId`), khoảng thời gian (`startDate`, `endDate`) và từ khóa tìm kiếm (`search`).
      - Bảo vệ tuyệt đối bằng cơ chế RBAC cấp controller (`@Roles(UserRole.ADMIN)`).
  - **Module 6 Frontend: Admin Dashboard & Audit Logs Explorer Workspace**:
    - **Trung tâm Giám sát Tài nguyên & LLMOps**:
      - Bảng điều khiển trực quan 4 cụm chỉ số: Người dùng (RBAC breakdown), Tài liệu & Lưu trữ (MB/GB, vector chunks), Hoạt động Tra cứu & Độ trễ phản hồi, Chi phí AI (quy đổi USD và VND).
      - Thẻ tiến trình lưu trữ và phân bổ trạng thái tài liệu (`INDEXED`, `PROCESSING`, `FAILED`).
    - **Trình Thám hiểm Nhật ký An toàn (Audit Logs Explorer)**:
      - Bảng dữ liệu kiểm toán chi tiết: người dùng, phòng ban, loại hành động (có Action Badges màu ngữ nghĩa), tài nguyên bị tác động, IP, User-Agent, thời gian.
      - Thanh công cụ tìm kiếm và bộ lọc đa tiêu chí (Action, Search keyword, Reset filter).
      - Modal soi chi tiết Payload / Metadata JSON của từng hành động.
      - Phân trang chuẩn doanh nghiệp kèm đếm tổng bản ghi.
    - **Bảo mật Giao diện & RBAC Guard**:
      - Tự động kiểm tra quyền `ADMIN`. Người dùng không có quyền quản trị được chuyển hướng hoặc hiển thị màn hình từ chối truy cập (Access Denied) thân thiện.
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

