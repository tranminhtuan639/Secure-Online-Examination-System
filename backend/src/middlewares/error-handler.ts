import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' } });
};

// Error handler tập trung: không lộ stack trace hay chi tiết nội bộ ra ngoài (SEC-10)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code ?? 'ERROR', message: err.message } });
    return;
  }

  logger.error({ err }, 'Lỗi không xác định');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Lỗi máy chủ' } });
};
