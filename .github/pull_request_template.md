## Mô tả

<!-- PR này làm gì? Liên quan yêu cầu nào trong SRS (ví dụ FR-41, SEC-05)? -->

## Cách kiểm tra

<!-- Các bước kiểm tra hoặc test đã chạy -->

## Checklist

- [ ] Đã thêm hoặc cập nhật test
- [ ] `npm test`, `npm run lint`, `npm run typecheck` chạy xanh ở máy mình
- [ ] Không commit secret hoặc file `.env`
- [ ] Đã cập nhật hợp đồng API (`backend/src/openapi/registry.ts`) và `docs/openapi.json` nếu đổi API
- [ ] Đã báo nhóm nếu sửa `shared/` hoặc `schema.prisma`
- [ ] Đã qua checklist bảo mật (CONVENTION.md mục 6)
- [ ] Có ít nhất 1 người review (PR đụng auth/phân quyền thì người phụ trách ATTT review)
