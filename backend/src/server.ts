import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const app = createApp();

// Bind 0.0.0.0 và dùng PORT do Render cấp
app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Backend đang chạy tại cổng ${env.PORT}`);
});
