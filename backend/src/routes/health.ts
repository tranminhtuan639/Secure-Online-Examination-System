import { Router } from 'express';

export const healthRouter = Router();

// Dùng cho cron ping giữ service không ngủ (Render free tier) và kiểm tra trước buổi demo
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
