import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

// Validate đầu vào bằng schema Zod dùng chung. Lỗi sẽ được error handler xử lý (400).
export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.parse(req[source]);
    Object.defineProperty(req, source, { value: result, writable: true, configurable: true });
    next();
  };
