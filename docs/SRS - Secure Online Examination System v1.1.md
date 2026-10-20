# Đặc tả yêu cầu phần mềm (SRS)

## Secure Online Examination System – Hệ thống thi trắc nghiệm trực tuyến có kiểm soát bảo mật

Nhóm: \[Tên nhóm\] · Thành viên: \[Tên 1\], \[Tên 2\], \[Tên 3\] · Phiên bản 1.1 · Ngày 20/10/2026

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu mô tả yêu cầu của hệ thống thi trắc nghiệm trực tuyến gồm backend, ứng dụng web và ứng dụng desktop (Electron). Tài liệu dùng làm cơ sở cho thiết kế, phát triển, kiểm thử và nghiệm thu.

### 1.2 Phạm vi

Hệ thống cho phép giảng viên tạo ngân hàng câu hỏi và kỳ thi trắc nghiệm, sinh viên tham gia bằng mã và làm bài trực tuyến. Hệ thống tự chấm điểm, lưu kết quả và ghi lại các sự kiện quan trọng. Trọng tâm của đồ án là **tính đúng đắn và an toàn của quy trình thi phía server**, kèm một ứng dụng desktop chế độ thi (secure mode) làm lớp răn đe và ghi nhận.

**Ngoài phạm vi (bản đầu):** câu hỏi tự luận và chấm tay, proctoring bằng camera hoặc AI, chống gian lận bằng thiết bị ngoài (điện thoại, máy thứ hai), hỗ trợ macOS/Linux cho ứng dụng desktop, tích hợp hệ thống nhà trường thật.

### 1.3 Thuật ngữ

| Thuật ngữ               | Ý nghĩa                                                         |
| ----------------------- | --------------------------------------------------------------- |
| Kỳ thi (exam)           | Một bài thi trắc nghiệm do giảng viên tạo, có mã tham gia       |
| Mã tham gia (join code) | Mã do hệ thống sinh cho kỳ thi, sinh viên nhập để vào phòng thi |
| Lượt làm bài (attempt)  | Một lần làm bài của một sinh viên trong một kỳ thi              |
| Mã vai trò (role code)  | Mã dùng một lần để nâng tài khoản lên giảng viên                |
| Secure mode             | Chế độ thi trên ứng dụng desktop Electron                       |
| IDOR                    | Lỗi truy cập tài nguyên của người khác bằng cách đổi ID         |

## 2. Mô tả tổng quan

### 2.1 Vai trò người dùng

| Vai trò                 | Mô tả                                                                     | Cách có được           |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------- |
| Sinh viên (`STUDENT`)   | Tham gia kỳ thi, làm bài, xem kết quả của mình                            | Mặc định khi đăng ký   |
| Giảng viên (`LECTURER`) | Quản lý ngân hàng câu hỏi, kỳ thi, xem kết quả và log của kỳ thi mình tạo | Nhập mã vai trò hợp lệ |

Mã vai trò do nhà trường cấp ngoài hệ thống, được mô phỏng bằng script khi triển khai (không có vai trò Quản trị viên trong hệ thống).

### 2.2 Môi trường vận hành

- Web: trình duyệt hiện đại, deploy trên Vercel.
- Backend: Node.js trên Render (free tier), cơ sở dữ liệu PostgreSQL trên Supabase (free tier).
- Desktop: ứng dụng Electron cho Windows, phát hành qua GitHub Releases.

### 2.3 Công nghệ

| Thành phần       | Công nghệ                                    |
| ---------------- | -------------------------------------------- |
| Frontend         | React + TypeScript                           |
| Desktop client   | Electron, đóng gói bằng electron-builder     |
| Backend          | Node.js + Express + TypeScript               |
| Cơ sở dữ liệu    | PostgreSQL, ORM Prisma                       |
| Xác thực         | Argon2id, access token + refresh token       |
| Realtime         | Socket.IO                                    |
| Validation       | Zod (schema dùng chung trong package shared) |
| Tài liệu API     | OpenAPI + Swagger UI                         |
| Kiểm thử         | Vitest + Supertest, k6 cho load test         |
| Log              | Pino                                         |
| CI/CD            | GitHub Actions                               |
| Môi trường local | Docker Compose (PostgreSQL)                  |
| Chất lượng code  | ESLint, Prettier, husky                      |

Cấu trúc monorepo: `backend/`, `web/`, `desktop/`, `shared/`.

### 2.4 Ràng buộc

- Chi phí hạ tầng bằng 0 (gói free của Render, Supabase, Vercel).
- Render free tier tự ngủ sau 15 phút không có request, thời gian khởi động lại khoảng 1 phút. Supabase free tự pause project sau 7 ngày không hoạt động.
- Prisma dùng hai biến kết nối: `DATABASE_URL` (pooler, cho ứng dụng) và `DIRECT_URL` (kết nối trực tiếp, cho migration).
- Rate limit lưu trong bộ nhớ nên mất khi backend khởi động lại. Giới hạn này được chấp nhận trong phạm vi đồ án.

### 2.5 Giả định

- Mã vai trò giảng viên do nhà trường cấp ngoài hệ thống, được mô phỏng bằng script khi triển khai.
- Mọi quyết định liên quan đến giờ thi, chấm điểm và quyền truy cập đều do server quyết định. Client (kể cả ứng dụng desktop) **không được tin cậy**.

## 3. Yêu cầu chức năng

Mức ưu tiên: **P1** bắt buộc cho bản đầu, **P2** làm nếu còn thời gian.

### 3.1 Tài khoản và xác thực

| Mã    | Yêu cầu                                                                                                                                                                                                                           | Ưu tiên |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-01 | Người dùng đăng ký bằng email và mật khẩu, vai trò mặc định là sinh viên                                                                                                                                                          | P1      |
| FR-02 | Đăng nhập, nhận access token (hạn 15 phút) và refresh token trong phần thân phản hồi                                                                                                                                              | P1      |
| FR-03 | Làm mới phiên bằng refresh token. Mỗi lần làm mới cấp token mới và vô hiệu token cũ (rotation); phát hiện dùng lại token cũ thì thu hồi cả chuỗi phiên                                                                            | P2      |
| FR-04 | Đăng xuất thu hồi refresh token hiện tại                                                                                                                                                                                          | P1      |
| FR-05 | Xem và sửa thông tin cá nhân, đổi mật khẩu                                                                                                                                                                                        | P1      |
| FR-06 | Mỗi tài khoản chỉ có một phiên đang thi tại một thời điểm                                                                                                                                                                         | P2      |
| FR-07 | Hệ thống cấp refresh token (hạn 7 ngày, chỉ lưu hash trong DB) khi đăng nhập. Client dùng refresh token để lấy access token mới (hạn 15 phút) mà không bắt người dùng đăng nhập lại giữa bài thi. Đăng xuất thu hồi refresh token | P1      |

### 3.2 Nâng quyền giảng viên bằng mã vai trò

| Mã    | Yêu cầu                                                                                                              | Ưu tiên |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-10 | Trang thông tin cá nhân có ô nhập mã vai trò. Nhập mã hợp lệ thì vai trò chuyển thành giảng viên                     | P1      |
| FR-11 | Mã vai trò dùng một lần, có hạn dùng, được sinh ngẫu nhiên bằng bộ sinh số an toàn, chỉ lưu hash trong cơ sở dữ liệu | P1      |
| FR-12 | Sinh mã vai trò bằng script (ví dụ `npm run gen-code -- --role lecturer`), mã gốc chỉ hiển thị một lần               | P1      |
| FR-13 | Sau khi nâng quyền, token cũ được cấp lại để vai trò mới có hiệu lực                                                 | P1      |

### 3.3 Ngân hàng câu hỏi

| Mã    | Yêu cầu                                                                                  | Ưu tiên |
| ----- | ---------------------------------------------------------------------------------------- | ------- |
| FR-20 | Giảng viên tạo, sửa, xóa câu hỏi trắc nghiệm (nội dung, các lựa chọn, đáp án đúng, điểm) | P1      |
| FR-21 | Câu hỏi được gom theo chủ đề hoặc thẻ (tag)                                              | P2      |
| FR-22 | Giảng viên chỉ thấy và quản lý câu hỏi của chính mình                                    | P1      |
| FR-23 | Nhập câu hỏi hàng loạt từ file CSV                                                       | P2      |

### 3.4 Kỳ thi và mã tham gia

| Mã    | Yêu cầu                                                                                 | Ưu tiên |
| ----- | --------------------------------------------------------------------------------------- | ------- |
| FR-30 | Giảng viên tạo kỳ thi: tiêu đề, thời lượng, giờ mở, giờ đóng, số câu hỏi                | P1      |
| FR-31 | Sinh đề thi từ ngân hàng câu hỏi: chọn thủ công hoặc ngẫu nhiên theo chủ đề và số lượng | P1      |
| FR-32 | Khi tạo kỳ thi, hệ thống tự sinh mã tham gia (6-8 ký tự chữ và số, bỏ ký tự dễ nhầm)    | P1      |
| FR-33 | Giảng viên tạm khóa kỳ thi, đổi mã tham gia, hoặc đóng kỳ thi sớm                       | P1      |
| FR-34 | Giảng viên bật tùy chọn xáo thứ tự câu hỏi và đáp án cho từng thí sinh                  | P2      |
| FR-35 | Giảng viên chỉ quản lý kỳ thi do mình tạo                                               | P1      |
| FR-36 | Giới hạn danh sách sinh viên được phép (theo email hoặc mã sinh viên)                   | P2      |

### 3.5 Làm bài thi

| Mã    | Yêu cầu                                                                                                                                                                                                                                                                                                                  | Ưu tiên |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| FR-40 | Sinh viên nhập mã tham gia. Server kiểm tra mã, giờ mở/đóng, trạng thái kỳ thi và tạo lượt làm bài ở trạng thái chưa bắt đầu                                                                                                                                                                                             | P1      |
| FR-41 | Mỗi sinh viên chỉ có **một** lượt làm bài cho mỗi kỳ thi (ràng buộc unique trong cơ sở dữ liệu)                                                                                                                                                                                                                          | P1      |
| FR-42 | Khi sinh viên bấm bắt đầu, server ghi `started_at` và tính `deadline = min(started_at + thời lượng, giờ đóng kỳ thi)`                                                                                                                                                                                                    | P1      |
| FR-43 | Server chỉ trả đề thi sau khi bắt đầu và trong thời hạn. Đề không chứa đáp án đúng                                                                                                                                                                                                                                       | P1      |
| FR-44 | Client tự lưu đáp án định kỳ (autosave). Server từ chối ghi đáp án sau `deadline`                                                                                                                                                                                                                                        | P1      |
| FR-45 | Nộp bài. Server chuyển trạng thái sang đã nộp và từ chối mọi lần nộp lặp lại                                                                                                                                                                                                                                             | P1      |
| FR-46 | Khi có yêu cầu đọc dữ liệu lượt thi (kết quả, trạng thái, danh sách của giảng viên), backend đóng và chấm các lượt `IN_PROGRESS` đã quá hạn bằng thao tác có điều kiện trong database (chỉ một yêu cầu thắng khi nhiều yêu cầu đồng thời). Mọi API đọc trạng thái lượt thi phải xử lý quá hạn nhất quán. Không dùng cron | P1      |
| FR-47 | Mất kết nối hoặc tắt ứng dụng: vào lại bằng mã sẽ tiếp tục lượt cũ, đồng hồ không bị đặt lại                                                                                                                                                                                                                             | P1      |
| FR-48 | Hiển thị đồng hồ đếm ngược dựa trên giờ của server                                                                                                                                                                                                                                                                       | P1      |

### 3.6 Chấm điểm và kết quả

| Mã    | Yêu cầu                                                                                                          | Ưu tiên |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| FR-50 | Server tự chấm điểm câu trắc nghiệm khi nộp bài hoặc khi hết giờ                                                 | P1      |
| FR-51 | Sinh viên xem điểm và trạng thái của bản thân ngay sau khi nộp bài. Đáp án đúng chỉ xem được sau khi kỳ thi đóng | P1      |
| FR-52 | Giảng viên xem danh sách kết quả và thống kê cơ bản của kỳ thi mình tạo                                          | P1      |
| FR-53 | Giảng viên chọn thời điểm cho phép sinh viên xem đáp án đúng (không xem trước khi kỳ thi đóng)                   | P2      |
| FR-54 | Xuất báo cáo kết quả ra CSV                                                                                      | P1      |
| FR-55 | Xuất báo cáo PDF                                                                                                 | P2      |

### 3.7 Ghi nhận sự kiện

| Mã    | Yêu cầu                                                                                                                                                                                                                                           | Ưu tiên |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-60 | Ghi log các sự kiện: đăng nhập thành công/thất bại, nhập mã sai, dùng mã vai trò, bắt đầu và nộp bài, thay đổi kỳ thi                                                                                                                             | P1      |
| FR-61 | Electron gửi `FOCUS_LOST` khi cửa sổ mất focus và `FOCUS_GAINED` khi lấy lại focus. `FOCUS_GAINED` chỉ gửi khi trạng thái chuyển từ mất focus sang có focus, không gửi liên tục                                                                   | P1      |
| FR-62 | Electron gửi `SECURE_MODE_ENTER` khi vào chế độ thi, `SECURE_MODE_EXIT` khi thoát fullscreen, `WINDOW_CLOSE_REQUESTED` khi có yêu cầu đóng cửa sổ                                                                                                 | P1      |
| FR-63 | Log chỉ được thêm, không có chức năng sửa hoặc xóa qua API                                                                                                                                                                                        | P1      |
| FR-64 | Cảnh báo thời gian thực cho giảng viên qua Socket.IO                                                                                                                                                                                              | P2      |
| FR-68 | Endpoint nhận sự kiện giới hạn tần suất theo lượt thi, giới hạn kích thước metadata (tối đa 1024 ký tự), chỉ chấp nhận các loại sự kiện của client. Sự kiện hệ thống (`ATTEMPT_STARTED`, `ATTEMPT_SUBMITTED`, `ATTEMPT_EXPIRED`) do server tự ghi | P1      |

Sự kiện từ client chỉ mang tính **tham khảo**, vì client có thể bị chỉnh sửa. Log không được dùng như bằng chứng tuyệt đối về gian lận.

### 3.8 Ứng dụng desktop (secure mode)

| Mã    | Yêu cầu                                                                                                                                                                                                                                                                                                                         | Ưu tiên |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-70 | Bọc ứng dụng web trong Electron, đăng nhập và làm bài thi giống bản web                                                                                                                                                                                                                                                         | P1      |
| FR-71 | Khi vào thi, cửa sổ chạy toàn màn hình (kiosk), luôn ở trên cùng                                                                                                                                                                                                                                                                | P1      |
| FR-72 | Bật bảo vệ nội dung (`setContentProtection`) để hạn chế chụp và quay màn hình                                                                                                                                                                                                                                                   | P1      |
| FR-73 | Vô hiệu hóa sao chép, dán, chuột phải trong cửa sổ thi và xóa clipboard định kỳ                                                                                                                                                                                                                                                 | P1      |
| FR-74 | Phát hiện mất focus và các tổ hợp phím liên quan, gửi sự kiện về server                                                                                                                                                                                                                                                         | P1      |
| FR-75 | Trước khi bắt đầu, quét danh sách ứng dụng cấm và yêu cầu sinh viên tự đóng. Không tự động tắt tiến trình khác                                                                                                                                                                                                                  | P1      |
| FR-76 | Hiển thị thông báo rõ ràng về dữ liệu ứng dụng thu thập, chỉ thu thập trong lúc thi                                                                                                                                                                                                                                             | P1      |
| FR-77 | Gửi heartbeat định kỳ. Mất heartbeat quá ngưỡng thì ghi sự kiện                                                                                                                                                                                                                                                                 | P2      |
| FR-78 | Kiểm tra phiên bản ứng dụng khi kết nối. Server từ chối bản quá cũ                                                                                                                                                                                                                                                              | P2      |
| FR-79 | Phát hiện máy ảo và điều khiển từ xa                                                                                                                                                                                                                                                                                            | P2      |
| FR-85 | Mỗi lượt thi lưu loại client (`WEB` hoặc `DESKTOP`) của lần vào gần nhất. Dashboard giảng viên hiển thị loại client. Với `WEB`, dashboard ghi rõ không có dữ liệu giám sát focus và không được hiểu 0 sự kiện là không vi phạm. `DESKTOP` chỉ là khai báo từ client, không phải bằng chứng ứng dụng thật sự chạy trong Electron | P1      |

Bản web luôn là phương án dự phòng. Kỳ thi có thể yêu cầu hoặc không yêu cầu secure mode (bắt buộc Electron là P2).

## 4. Yêu cầu bảo mật

| Mã     | Yêu cầu                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Mật khẩu băm bằng Argon2id. Không ghi mật khẩu hay token vào log                                                                                                           |
| SEC-02 | Access token hạn ngắn (15 phút). Refresh token lưu dạng hash trong cơ sở dữ liệu (hạn 7 ngày). Rotation và phát hiện dùng lại token cũ (thu hồi cả chuỗi phiên) là P2      |
| SEC-03 | Web lưu refresh token trong localStorage, Electron lưu bằng `safeStorage`. Access token giữ trong bộ nhớ. Rủi ro XSS của web được giảm bằng CSP, rotation và thời hạn ngắn |
| SEC-04 | Vai trò được kiểm tra ở server cho mọi API. Không bao giờ nhận vai trò từ client                                                                                           |
| SEC-05 | Kiểm tra quyền sở hữu tài nguyên ở mọi API (chống IDOR): sinh viên chỉ truy cập lượt làm bài của mình, giảng viên chỉ truy cập kỳ thi và câu hỏi của mình                  |
| SEC-06 | API dành cho sinh viên không bao giờ trả đáp án đúng trước thời điểm cho phép                                                                                              |
| SEC-07 | Giờ bắt đầu, hạn nộp và trạng thái kỳ thi do server tính. Không tin đồng hồ của client                                                                                     |
| SEC-08 | Chống nộp trùng và xử lý đồng thời bằng ràng buộc unique và transaction trong PostgreSQL, không dựa vào biến trong bộ nhớ                                                  |
| SEC-09 | Rate limit cho đăng nhập, nhập mã tham gia, nhập mã vai trò và nộp bài. Thông báo lỗi chung chung, không phân biệt mã sai với mã hết hạn                                   |
| SEC-10 | Mọi đầu vào được validate bằng Zod ở server. Error handler tập trung, không lộ stack trace                                                                                 |
| SEC-11 | Dùng helmet, cấu hình CORS chỉ cho phép đúng origin của web và ứng dụng desktop                                                                                            |
| SEC-12 | Socket.IO xác thực token ở handshake và kiểm tra quyền khi vào room. Client tự kết nối lại khi bị ngắt                                                                     |
| SEC-13 | Electron: bật `contextIsolation`, tắt `nodeIntegration`, preload với IPC tối thiểu, đặt CSP, chặn điều hướng ra domain ngoài danh sách cho phép                            |
| SEC-14 | Endpoint nhận sự kiện áp dụng rate limit và giới hạn kích thước dữ liệu, chặn client gửi dồn dập hoặc dữ liệu quá lớn                                                      |
| SEC-15 | Secret (khóa JWT, chuỗi kết nối) lưu trong biến môi trường, không commit vào repository. Mỗi package có `.env.example`                                                     |
| SEC-16 | Mã vai trò: ngẫu nhiên, dùng một lần, có hạn, chỉ lưu hash                                                                                                                 |
| SEC-17 | Mã tham gia kỳ thi: ngẫu nhiên, có hiệu lực trong cửa sổ thời gian, có thể đổi hoặc khóa. Biết mã không đồng nghĩa với xem được đề                                         |

### 4.1 Mô hình đe dọa sơ bộ (STRIDE)

| Mối đe dọa      | Ví dụ                                        | Biện pháp                                      |
| --------------- | -------------------------------------------- | ---------------------------------------------- |
| Giả mạo         | Dùng token đánh cắp hoặc đăng nhập hộ        | Token ngắn hạn, rotation, một phiên thi        |
| Chỉnh sửa       | Sửa đáp án sau hạn, sửa điểm                 | Kiểm tra deadline ở server, audit log chỉ thêm |
| Chối bỏ         | Phủ nhận hành vi                             | Audit log kèm thời gian, IP, người thực hiện   |
| Lộ thông tin    | Lấy đáp án qua API, đoán ID kỳ thi, đoán mã  | SEC-05, SEC-06, SEC-17, rate limit             |
| Từ chối dịch vụ | Cả lớp vào cùng lúc, gửi dồn request nộp bài | Rate limit, autosave, load test bằng k6        |
| Nâng quyền      | Sinh viên đoán hoặc xin mã vai trò           | SEC-16, SEC-09, kiểm tra vai trò ở server      |

## 5. Yêu cầu phi chức năng

| Mã     | Yêu cầu                                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Hiệu năng: chịu được ít nhất 50 sinh viên làm bài đồng thời trên môi trường local (đo bằng k6). Kết quả đo trên free tier chỉ mang tính tham khảo        |
| NFR-02 | Độ tin cậy: autosave không làm mất đáp án khi mất mạng ngắn. Ứng dụng tự kết nối lại sau khi service khởi động lại                                       |
| NFR-03 | Khả dụng: có endpoint `/health`. Trước buổi demo, hệ thống được đánh thức và kiểm tra                                                                    |
| NFR-04 | Khả năng bảo trì: code TypeScript, ESLint, Prettier, cấu trúc phân tầng routes, controllers, services, repositories                                      |
| NFR-05 | Kiểm thử: có test tự động cho các kịch bản chính (nộp sau giờ, nộp trùng, truy cập bài người khác, nâng quyền sai), chạy trong CI                        |
| NFR-06 | Tài liệu: SRS, ERD, sơ đồ kiến trúc, Swagger UI, hướng dẫn cài đặt, hướng dẫn chạy demo                                                                  |
| NFR-07 | Quyền riêng tư: chỉ thu thập dữ liệu cần thiết trong lúc thi, thông báo rõ cho người dùng                                                                |
| NFR-08 | Tương thích: web trên trình duyệt hiện đại. Ứng dụng desktop trên Windows 10 trở lên                                                                     |
| NFR-09 | Có báo cáo kiểm thử bảo mật nội bộ gồm: kịch bản tấn công, mức độ nghiêm trọng, bằng chứng, cách sửa, kết quả kiểm thử lại. Thêm vào tiêu chí nghiệm thu |

## 6. Mô hình dữ liệu sơ bộ

| Bảng              | Trường chính                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users             | id, email, password\_hash, role (`STUDENT` \| `LECTURER`), display\_name, created\_at                                                                           |
| refresh\_tokens   | id, user\_id, token\_hash, expires\_at, revoked\_at (chưa có `family_id` — thêm khi làm rotation P2)                                                            |
| role\_codes       | id, code\_hash, expires\_at, used\_by, used\_at, created\_at                                                                                                    |
| questions         | id, owner\_id, content, points, created\_at                                                                                                                     |
| question\_options | id, question\_id, content, is\_correct, position                                                                                                                |
| exams             | id, owner\_id, title, join\_code (unique), opens\_at, closes\_at, duration\_minutes, status (`ACTIVE` \| `CLOSED`)                                              |
| exam\_questions   | exam\_id, question\_id, position                                                                                                                                |
| attempts          | id, exam\_id, user\_id, started\_at, deadline, submitted\_at, status, score, client (`WEB` \| `DESKTOP`, nullable tới khi bắt đầu). Unique (exam\_id, user\_id) |
| attempt\_answers  | attempt\_id, question\_id, selected\_option\_id, updated\_at                                                                                                    |
| exam\_events      | id, attempt\_id, event\_type, metadata, created\_at                                                                                                             |

Trạng thái lượt làm bài: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`.

Loại sự kiện (`event_type`): 3 loại hệ thống (`ATTEMPT_STARTED`, `ATTEMPT_SUBMITTED`, `ATTEMPT_EXPIRED`) do server ghi; 5 loại client (`FOCUS_LOST`, `FOCUS_GAINED`, `SECURE_MODE_ENTER`, `SECURE_MODE_EXIT`, `WINDOW_CLOSE_REQUESTED`).

Ghi chú: Không còn bảng `audit_logs` toàn hệ thống. Các trường `questions.tag`, `exams.shuffle`, `exams.secure_mode`, `role_codes.role`, `role_codes.created_by` thuộc P2 hoặc không cần ở MVP. Kỳ thi đang mở hay chưa do server tính từ `opens_at` và `closes_at`.

## 7. Luồng nghiệp vụ chính

1. Giảng viên tạo câu hỏi và kỳ thi. Hệ thống sinh mã tham gia.
2. Sinh viên nhập mã. Server kiểm tra mã, giờ thi, trạng thái và tạo lượt làm bài.
3. Sinh viên bấm bắt đầu. Server ghi `started_at`, tính `deadline` và trả đề đã xáo, không kèm đáp án.
4. Client autosave đáp án định kỳ và gửi sự kiện. Server từ chối ghi sau `deadline`.
5. Sinh viên nộp bài hoặc hết giờ. Server chấm điểm, đóng lượt làm bài, từ chối nộp lại.
6. Sinh viên xem kết quả. Giảng viên xem kết quả, log sự kiện và xuất báo cáo.

## 8. Giới hạn đã biết

- Client chạy trên máy thí sinh nên không thể tin cậy tuyệt đối. Ứng dụng desktop chỉ là lớp răn đe và ghi nhận, quyết định cuối cùng luôn do server.
- Không ngăn được chụp bằng điện thoại, thiết bị thứ hai, người ngồi cạnh hoặc máy ảo trong mọi trường hợp.
- Không chặn được một số tổ hợp phím hệ thống như Ctrl+Alt+Del.
- Rate limit lưu trong bộ nhớ, mất khi backend khởi động lại.
- Web lưu refresh token trong localStorage, có rủi ro XSS đã nêu ở SEC-03.
- Mọi sinh viên có mã tham gia đều vào được kỳ thi, trừ khi bật tùy chọn danh sách cho phép (FR-36).
- Hạ tầng free tier có thể ngủ hoặc bị pause, ảnh hưởng thời gian phản hồi.

## 9. Tiêu chí nghiệm thu

1. Chạy trọn kịch bản demo trên link deploy: giảng viên tạo kỳ thi, sinh viên vào bằng mã, làm bài, nộp, xem kết quả.
2. Các test tự động trong CI đều đạt, gồm các kịch bản bảo mật ở NFR-05.
3. Có báo cáo kiểm thử bảo mật nội bộ (NFR-09): kịch bản tấn công, mức độ nghiêm trọng, bằng chứng, cách sửa, kết quả kiểm thử lại.
4. Có kết quả load test và ghi rõ điều kiện đo.
5. Có ứng dụng desktop cài được trên một máy Windows khác và hoạt động ở secure mode.

## 10. Phân công và kế hoạch (nháp)

| Thành viên                    | Trách nhiệm chính                                           |
| ----------------------------- | ----------------------------------------------------------- |
| \[Thành viên 1\] (full-stack) | Web, câu hỏi, kỳ thi, làm bài, deploy                       |
| \[Thành viên 2\] (ATTT)       | Xác thực, role code, phân quyền, test bảo mật, threat model |
| \[Thành viên 3\] (ATTT)       | Electron, event, dashboard, đóng gói                        |

Thứ tự thực hiện: (1) skeleton monorepo, deploy thử, CI; (2) xác thực và phân quyền; (3) lõi thi trên web; (4) Electron và log sự kiện; (5) kiểm thử bảo mật, load test, hoàn thiện tài liệu.

## 11. Câu hỏi còn mở

- Giảng viên môn học yêu cầu tối thiểu bao nhiêu người dùng và kiểm tra bằng cách nào?
- Có cho phép làm lại bài thi không? (hiện tại: một lượt cho mỗi kỳ thi)
- Có cần danh sách sinh viên được phép thi ngay từ bản đầu không?
