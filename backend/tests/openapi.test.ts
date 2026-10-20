import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

describe('OpenAPI', () => {
  it('GET /openapi.json trả về tài liệu OpenAPI 3', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths['/health']).toBeDefined();
  });

  it('có hợp đồng cho các endpoint chính và dùng schema dùng chung', async () => {
    const res = await request(app).get('/openapi.json');
    const paths = res.body.paths;
    expect(paths['/api/v1/auth/login'].post).toBeDefined();
    expect(paths['/api/v1/exams/join'].post).toBeDefined();
    expect(paths['/api/v1/attempts/{id}/submit'].post).toBeDefined();
    expect(res.body.components.schemas.LoginInput).toBeDefined();
  });

  it('đề gửi cho sinh viên không có trường isCorrect (SEC-06)', async () => {
    const res = await request(app).get('/openapi.json');
    const start = res.body.components.schemas.AttemptStartResponse;
    expect(JSON.stringify(start)).not.toContain('isCorrect');
  });

  it('GET /docs trả về trang Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
