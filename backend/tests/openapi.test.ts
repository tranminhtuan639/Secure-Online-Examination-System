import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function getSpec() {
  const res = await request(app).get('/openapi.json');
  expect(res.status).toBe(200);
  return res.body;
}

describe('OpenAPI', () => {
  it('GET /openapi.json trả về tài liệu OpenAPI 3', async () => {
    const spec = await getSpec();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths['/health']).toBeDefined();
  });

  it('có hợp đồng cho các luồng chính của SRS', async () => {
    const { paths } = await getSpec();
    const expected = [
      ['/api/v1/auth/login', 'post'],
      ['/api/v1/auth/refresh', 'post'],
      ['/api/v1/me/role-code', 'post'],
      ['/api/v1/questions/{id}', 'put'],
      ['/api/v1/exams/join', 'post'],
      ['/api/v1/exams/{id}/close', 'post'],
      ['/api/v1/attempts/{id}/start', 'post'],
      ['/api/v1/attempts/{id}', 'get'],
      ['/api/v1/attempts/{id}/submit', 'post'],
      ['/api/v1/attempts/{id}/result', 'get'],
      ['/api/v1/attempts/{id}/events', 'post'],
      ['/api/v1/exams/{id}/attempts', 'get'],
      ['/api/v1/exams/{id}/attempts/{attemptId}/events', 'get'],
    ] as const;
    for (const [path, method] of expected) {
      expect(paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });

  it('chỉ có hai vai trò STUDENT và LECTURER, không có ADMIN', async () => {
    const spec = await getSpec();
    expect(spec.components.schemas.User.properties.role.enum).toEqual(['STUDENT', 'LECTURER']);
    expect(JSON.stringify(spec)).not.toMatch(/ADMIN|TEACHER/);
  });

  it('đề gửi cho sinh viên không có đáp án đúng (SEC-05)', async () => {
    const { components } = await getSpec();
    for (const name of ['AttemptStartResponse', 'AttemptState']) {
      const text = JSON.stringify(components.schemas[name]);
      expect(text, name).not.toContain('isCorrect');
      expect(text, name).not.toContain('correctOptionId');
    }
  });

  it('đáp án đúng chỉ xuất hiện trong kết quả sau khi kỳ thi đóng, và nullable (SEC-05)', async () => {
    const { components } = await getSpec();
    const review = components.schemas.AttemptReview.properties.review;
    expect(review.nullable).toBe(true);
    expect(JSON.stringify(review)).toContain('correctOptionId');
  });

  it('mọi endpoint cần đăng nhập đều khai báo bearerAuth, trừ register/login/refresh/health', async () => {
    const { paths } = await getSpec();
    const publicPaths = [
      '/health',
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
    ];
    for (const [path, methods] of Object.entries<Record<string, { security?: unknown[] }>>(paths)) {
      for (const [method, op] of Object.entries(methods)) {
        const isPublic = publicPaths.includes(path);
        const secured = (op.security ?? []).length > 0;
        expect(secured, `${method.toUpperCase()} ${path}`).toBe(!isPublic);
      }
    }
  });

  it('endpoint nhận sự kiện không cho client gửi loại sự kiện của hệ thống (SEC-11)', async () => {
    const { components } = await getSpec();
    const types = components.schemas.CreateExamEventInput.properties.type.enum;
    expect(types).toContain('FOCUS_LOST');
    expect(types).not.toContain('ATTEMPT_STARTED');
    expect(types).not.toContain('ATTEMPT_SUBMITTED');
  });

  it('GET /docs trả về trang Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
