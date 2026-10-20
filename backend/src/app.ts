import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { buildOpenApiDocument } from './openapi/spec';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  // Render đứng sau proxy, cần để rate limit lấy đúng IP
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Chỉ log method, URL, status. Không log header (tránh lộ token, giữ log gọn).
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // Khi chạy http://localhost, 'upgrade-insecure-requests' làm Swagger UI không tải được
  // script/CSS. Chỉ giữ chỉ thị này ở production (có HTTPS).
  const cspDirectives = { ...helmet.contentSecurityPolicy.getDefaultDirectives() };
  if (env.NODE_ENV !== 'production') delete cspDirectives['upgrade-insecure-requests'];
  app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));

  app.use(cors({ origin: env.corsOrigins, credentials: false }));
  app.use(express.json({ limit: '100kb' }));

  // Rate limit chung. Rate limit riêng cho login, nhập mã và nộp bài sẽ đặt ở từng route.
  // Lưu ý: lưu trong bộ nhớ nên mất khi service khởi động lại (đã ghi trong SRS mục 8).
  app.use(
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }),
  );

  app.use(healthRouter);

  if (env.ENABLE_DOCS) {
    const document = buildOpenApiDocument();
    app.get('/openapi.json', (_req, res) => {
      res.json(document);
    });
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
  }

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
