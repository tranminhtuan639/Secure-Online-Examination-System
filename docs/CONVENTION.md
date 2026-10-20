# Quy ước làm việc nhóm

Tài liệu ngắn để 3 người code chung ít lỗi. Gặp tình huống chưa có ở đây thì thống nhất trong nhóm rồi **bổ sung vào file này bằng một pull request**.

## 1. Git

### Nhánh

| Nhánh                | Vai trò                         | Quy tắc                                                                    |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `main`               | Ổn định, dùng để demo và deploy | Được bảo vệ. Chỉ nhận merge từ `develop` khi chốt mốc hoặc trước buổi demo |
| `develop`            | Tích hợp                        | Được bảo vệ. Nhận merge từ các nhánh làm việc                              |
| `feature/<tên-ngắn>` | Tính năng mới                   | Tách từ `develop`                                                          |
| `fix/<tên-ngắn>`     | Sửa lỗi                         | Tách từ `develop`                                                          |
| `docs/<tên-ngắn>`    | Chỉ sửa tài liệu                | Tách từ `develop`                                                          |

- **Không push thẳng `main` và `develop`.** Không `force push` lên hai nhánh này.
- Tên nhánh chữ thường, nối bằng dấu gạch ngang, ví dụ `feature/attempt-submit`.
- Mỗi nhánh làm **một việc**, sống ngắn (vài ngày). Nhánh càng lâu càng dễ xung đột.

### Commit

- Mỗi người commit **dưới tên mình**, đều đặn, commit nhỏ. Không dồn một cục trước hạn nộp.
- Kiểm tra danh tính trước khi commit lần đầu. Email phải trùng email của tài khoản GitHub, nếu không GitHub không tính đóng góp:
  ```bash
  git config user.name "Tên của bạn"
  git config user.email "email-gắn-với-github@example.com"
  ```
- Cú pháp: `<loại>(<phạm vi>): <mô tả ngắn> (<mã yêu cầu>)`
  - Loại: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`
  - Ví dụ: `feat(attempt): chặn nộp bài sau deadline (FR-44)`
- Làm chung một đoạn code thì thêm vào cuối commit: `Co-authored-by: Tên <email>`.

### Pull request và review

1. Cập nhật nhánh từ `develop` trước khi mở PR: `git fetch origin && git merge origin/develop`.
2. Mở PR vào `develop`, điền đủ mẫu PR (mô tả, cách kiểm tra, checklist).
3. **Cần tối thiểu 1 người review và CI xanh mới được merge.** Tác giả không tự merge khi chưa có review.
4. PR đụng tới **xác thực, phân quyền, token, mã vai trò, mã tham gia** thì người phụ trách ATTT phải review.
5. Merge bằng **Merge commit** (không squash) để giữ lịch sử commit của từng người. Xóa nhánh sau khi merge.
6. PR nhỏ (dưới khoảng 400 dòng) dễ review hơn. Việc lớn thì chia nhỏ.

Người review kiểm tra: đúng yêu cầu trong SRS, có test, không lộ secret, checklist bảo mật ở mục 6.

## 2. Cấu trúc và code

- Ngôn ngữ **TypeScript** cho mọi package. Không dùng `any` nếu không có lý do (ghi comment giải thích).
- Backend chia tầng, mỗi tầng một trách nhiệm:
  `routes` (khai báo đường dẫn, gắn middleware) → `controllers` (đọc request, trả response) → `services` (nghiệp vụ) → `repositories` (truy vấn Prisma).
  Controller không gọi Prisma trực tiếp. Service không đụng `req`/`res`.
- Mọi đầu vào được validate bằng **schema Zod trong `shared/`** qua middleware `validate`. Không tự viết kiểm tra rải rác.
- Schema và type dùng chung giữa các package đặt trong `shared/`, **không copy-paste** sang web hay backend.
- Lỗi nghiệp vụ ném bằng `AppError` (`src/lib/errors.ts`). Không `try/catch` rồi nuốt lỗi. Error handler tập trung lo phần còn lại.
- Đặt tên: file và thư mục `kebab-case`, biến và hàm `camelCase`, type và class `PascalCase`, hằng số `UPPER_SNAKE_CASE`. Bảng DB `snake_case` (đã có `@map` trong Prisma).
- Format và lint tự chạy khi commit (husky). Đừng tắt, và đừng tranh cãi style, `prettier` quyết định.
- Comment giải thích **vì sao**, không lặp lại code làm gì. Code liên quan yêu cầu SRS thì ghi mã (`FR-44`, `SEC-05`).

## 3. API (contract-first)

Hợp đồng API nằm ở `backend/src/openapi/registry.ts`, sinh Swagger UI tại `http://localhost:3000/docs` và JSON tại `/openapi.json`.

**Quy trình thêm hoặc đổi endpoint:**

1. Sửa schema trong `shared/` (nếu có dữ liệu mới) và khai báo route trong `registry.ts`, đặt `status: 'planned'`.
2. Mở PR chỉ gồm hợp đồng, cả nhóm review. Merge xong người làm web và người làm backend cùng làm song song.
3. Khi code backend xong, đổi `status` thành `'done'` trong cùng PR.
4. Chạy `npm run openapi:export -w backend` để cập nhật `docs/openapi.json` rồi commit.

Quy ước endpoint:

- Tiền tố `/api/v1`. Tên tài nguyên là danh từ số nhiều: `/exams`, `/attempts`. ID là UUID.
- JSON `camelCase`. Thời gian là chuỗi ISO 8601 UTC (`2026-10-20T08:00:00.000Z`).
- Lỗi luôn có dạng `{ "error": { "code": "...", "message": "..." } }`.
- Mã trạng thái:

| Mã              | Dùng khi                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| 200 / 201 / 204 | Thành công / đã tạo / thành công không có nội dung                          |
| 400             | Dữ liệu không hợp lệ (Zod)                                                  |
| 401             | Chưa đăng nhập, token sai hoặc hết hạn                                      |
| 403             | Đã đăng nhập nhưng không đủ quyền hoặc không phải chủ tài nguyên            |
| 404             | Không tìm thấy (cũng dùng để không lộ sự tồn tại của tài nguyên người khác) |
| 409             | Xung đột trạng thái: nộp trùng, hết giờ, kỳ thi đã đóng                     |
| 429             | Vượt rate limit                                                             |

## 4. Database và Prisma

- Sửa `schema.prisma` là **thay đổi hợp đồng giữa các bên**: báo nhóm trước, không sửa âm thầm.
- Mỗi lần đổi schema tạo **một migration** với tên mô tả: `npm run db:migrate` rồi đặt tên như `add_exam_secure_mode`. Commit cả thư mục `prisma/migrations/`.
- **Không sửa migration đã merge.** Cần đổi thì tạo migration mới.
- Hai người cùng sửa schema ở hai nhánh: người merge sau cập nhật nhánh từ `develop`, xóa migration của mình, chạy lại `db:migrate` để tạo lại.
- Không chỉnh tay dữ liệu trong DB deploy. Cần dữ liệu mẫu thì viết script seed.
- Ứng dụng dùng `DATABASE_URL` (pooler). Migration dùng `DIRECT_URL`.

## 5. Test

- Tính năng mới có test (Vitest + Supertest). Sửa lỗi thì thêm test tái hiện lỗi đó.
- Các kịch bản bảo mật bắt buộc có test: nộp sau giờ, nộp trùng, đọc bài của người khác (IDOR), sinh viên gọi API của giảng viên, dùng lại refresh token cũ, nhập mã sai nhiều lần.
- `npm test`, `npm run lint`, `npm run typecheck` chạy xanh ở máy mình trước khi mở PR.
- Load test (k6) chạy trên môi trường local với Docker Compose, không chạy lên Render free tier.

## 6. Checklist bảo mật cho mọi PR

- [ ] Quyền được kiểm tra **ở server**, không dựa vào client. Không bao giờ nhận `role` từ client.
- [ ] Mọi API đọc hoặc sửa dữ liệu đều kiểm tra **chủ sở hữu** (chống IDOR), không chỉ kiểm tra vai trò.
- [ ] API cho sinh viên **không trả đáp án đúng** (`isCorrect`) trước thời điểm cho phép.
- [ ] Giờ thi, hạn nộp, trạng thái do **server** tính.
- [ ] Đầu vào được validate bằng Zod. Thông báo lỗi không lộ stack trace hay chi tiết nội bộ.
- [ ] Không ghi mật khẩu, token, mã vai trò vào log hay vào response.
- [ ] Endpoint nhạy cảm (đăng nhập, nhập mã, nộp bài) có rate limit.
- [ ] Hành động quan trọng (đăng nhập, dùng mã vai trò, bắt đầu/nộp bài, sự kiện client) được ghi log phù hợp.
- [ ] Không có secret trong code, trong commit hay trong lịch sử Git.

## 7. Môi trường và secret

- **Không bao giờ commit `.env`.** Chỉ commit `.env.example` (không chứa giá trị thật). Thêm biến mới thì cập nhật `.env.example` cùng PR.
- Secret JWT dùng chuỗi ngẫu nhiên dài, hai secret khác nhau. Secret deploy đặt trong Environment Variables của Render và Vercel.
- Lỡ commit secret: coi như **đã lộ**, đổi secret ngay, rồi mới xử lý lịch sử Git.
- Cổng Postgres local có thể khác nhau giữa các máy (xung đột với Postgres cài sẵn). Chỉnh trong `.env` của mình, không sửa `docker-compose.yml` để đẩy lên chỉ vì máy mình.

## 8. Định nghĩa "xong" (Definition of Done)

Một việc được coi là xong khi:

1. Đáp ứng đúng yêu cầu trong SRS (ghi mã yêu cầu trong PR).
2. Có test, CI xanh.
3. Qua checklist bảo mật mục 6.
4. Hợp đồng API và tài liệu (SRS, README) đã cập nhật nếu có thay đổi.
5. Đã được review và merge vào `develop`.

## 9. Phân công review (gợi ý)

| Mảng                                                        | Người làm chính | Người review chính |
| ----------------------------------------------------------- | --------------- | ------------------ |
| Web, câu hỏi, kỳ thi, làm bài, deploy                       | Thành viên 1    | Thành viên 2       |
| Xác thực, role code, phân quyền, test bảo mật, threat model | Thành viên 2    | Thành viên 3       |
| Electron, event, dashboard, đóng gói                        | Thành viên 3    | Thành viên 2       |

Điền tên thật.
