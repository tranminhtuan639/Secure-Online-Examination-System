export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg = 'Yêu cầu không hợp lệ') => new AppError(400, msg, 'BAD_REQUEST');
export const unauthorized = (msg = 'Chưa đăng nhập') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Không có quyền truy cập') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Không tìm thấy') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg = 'Xung đột dữ liệu') => new AppError(409, msg, 'CONFLICT');
