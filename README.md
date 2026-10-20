# Secure Online Examination System

Hệ thống thi trắc nghiệm trực tuyến có kiểm soát bảo mật. Xem đặc tả yêu cầu trong SRS (mã yêu cầu `FR-xx`, `SEC-xx`, `NFR-xx` dùng ở nhiều chỗ trong code và PR).

## Cấu trúc

```
secure-exam/
├── shared/    Schema Zod và type dùng chung (build bằng tsup, xuất ESM + CJS)
├── backend/   Node.js + Express + TypeScript + Prisma (PostgreSQL)
├── web/       React + TypeScript + Vite
├── desktop/   Electron (đóng gói bằng electron-builder)
├── docs/      SRS, ERD, threat model, báo cáo pentest, kết quả load test
└── .github/   CI (GitHub Actions) và mẫu pull request
```

## Yêu cầu

- Node.js 22 (xem `.nvmrc`), npm 10 trở lên
- Docker (chạy PostgreSQL local)

## Chạy lần đầu

```bash
npm install

# Database local
npm run db:up

# Backend
cp backend/.env.example backend/.env      # rồi sửa secret
npm run db:generate
npm run db:migrate                          # tạo bảng theo prisma/schema.prisma
npm run dev:backend                         # http://localhost:3000/health

# Web (terminal khác)
cp web/.env.example web/.env
npm run dev:web                             # http://localhost:5173
```

Desktop (cần build web trước nếu muốn chạy bản đóng gói):

```bash
# Dev: trỏ cửa sổ Electron vào web đang chạy
APP_URL=http://localhost:5173 npm run dev:desktop     # Windows PowerShell: $env:APP_URL="http://localhost:5173"; npm run dev:desktop

# Đóng gói ra file cài đặt .exe (kết quả trong desktop/release)
npm run build -w shared && npm run build -w web
npm run dist -w desktop
```

## Lệnh thường dùng

| Lệnh                              | Tác dụng                                                |
| --------------------------------- | ------------------------------------------------------- |
| `npm test`                        | Build shared rồi chạy test backend (Vitest + Supertest) |
| `npm run lint` / `npm run format` | ESLint / Prettier                                       |
| `npm run typecheck`               | Kiểm tra kiểu TypeScript cho toàn bộ package            |
| `npm run build`                   | Build tất cả                                            |
| `npm run db:up` / `db:down`       | Bật/tắt PostgreSQL local                                |

`husky` chạy `lint-staged` trước mỗi commit. Sau khi clone, chạy `npm install` để husky tự cài.

## Deploy (miễn phí)

| Thành phần | Nơi deploy           | Ghi chú                                                                                                                                                                                                                |
| ---------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database   | Supabase             | `DATABASE_URL` dùng pooler, `DIRECT_URL` dùng direct connection (cho migration). Free tier tự pause sau 7 ngày không hoạt động                                                                                         |
| Backend    | Render (Web Service) | Root Directory để trống (monorepo, cần build `shared`). Build: `npm install && npm run build -w shared && npm run build -w backend`. Start: `npm run start -w backend`. Chạy migration: `npm run db:deploy -w backend` |
| Web        | Vercel               | Root Directory `web`. Build command: `cd .. && npm install && npm run build -w shared && npm run build -w web`. Đặt `VITE_API_URL` trỏ về Render                                                                       |
| Desktop    | GitHub Releases      | Upload file `.exe` từ `desktop/release`                                                                                                                                                                                |

Lưu ý với Render free tier: service tự ngủ sau 15 phút không có request. Dùng cron ping `GET /health` mỗi 10 phút, và đánh thức trước buổi demo. Backend phải đặt `CORS_ORIGINS` gồm domain Vercel và origin của app Electron (xem `desktop/src/main.ts`).

## Tài liệu API

Hợp đồng API sinh tự động từ schema Zod trong `shared/` (file `backend/src/openapi/registry.ts`).

- Swagger UI: http://localhost:3000/docs
- JSON: http://localhost:3000/openapi.json
- Xuất ra file để review trong PR: `npm run openapi:export -w backend` (ghi vào `docs/openapi.json`)
- Tắt tài liệu công khai khi deploy: đặt `ENABLE_DOCS=false`

Endpoint ghi "Chưa làm" là hợp đồng đã chốt, chưa có code backend.

## Quy ước làm việc nhóm

Xem [CONVENTION.md](CONVENTION.md): quy ước Git (nhánh, commit, pull request, review), cấu trúc code, quy trình thêm API, migration, test, checklist bảo mật và định nghĩa "xong".

## Việc tiếp theo (gợi ý)

1. Deploy thử skeleton lên Render + Supabase + Vercel để lộ lỗi cấu hình sớm.
2. Auth: đăng ký, đăng nhập, refresh token rotation, middleware phân quyền.
3. Nâng quyền giảng viên bằng mã vai trò (script `gen-code`).
4. Ngân hàng câu hỏi, kỳ thi, mã tham gia, luồng làm bài (kiểm tra giờ ở server).
5. Secure mode trong Electron, Socket.IO log sự kiện.
