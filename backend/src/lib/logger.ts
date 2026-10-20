import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Không bao giờ ghi mật khẩu hay token vào log (SEC-01)
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
