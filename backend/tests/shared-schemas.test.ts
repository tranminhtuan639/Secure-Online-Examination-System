import {
  EVENT_METADATA_MAX_BYTES,
  ROLES,
  changePasswordSchema,
  createExamEventSchema,
  createExamSchema,
  createQuestionSchema,
  joinExamSchema,
  registerSchema,
  startAttemptSchema,
} from '@exam/shared';
import { describe, expect, it } from 'vitest';

const uuid = '3f0c8d1e-8a52-4f3e-9a58-0a4a1a8f0c11';

describe('schema dùng chung (shared)', () => {
  it('chỉ có vai trò STUDENT và LECTURER', () => {
    expect(ROLES).toEqual(['STUDENT', 'LECTURER']);
  });

  it('đăng ký bỏ qua trường role do client gửi (SEC-03)', () => {
    const parsed = registerSchema.parse({
      email: 'a@example.com',
      password: 'matkhau-dai-du',
      displayName: 'An',
      role: 'LECTURER',
    });
    expect(parsed).not.toHaveProperty('role');
  });

  it('đổi mật khẩu yêu cầu mật khẩu mới khác mật khẩu cũ', () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: 'abcdefgh',
      newPassword: 'abcdefgh',
    });
    expect(same.success).toBe(false);
  });

  it('câu hỏi phải có đúng một đáp án đúng (FR-21)', () => {
    const base = { content: 'Câu hỏi?', points: 1 };
    const two = createQuestionSchema.safeParse({
      ...base,
      options: [
        { content: 'A', isCorrect: true },
        { content: 'B', isCorrect: true },
      ],
    });
    const one = createQuestionSchema.safeParse({
      ...base,
      options: [
        { content: 'A', isCorrect: true },
        { content: 'B', isCorrect: false },
      ],
    });
    expect(two.success).toBe(false);
    expect(one.success).toBe(true);
  });

  it('kỳ thi phải có giờ đóng sau giờ mở (FR-30)', () => {
    const bad = createExamSchema.safeParse({
      title: 'Giữa kỳ',
      durationMinutes: 45,
      opensAt: '2026-11-01T08:00:00Z',
      closesAt: '2026-11-01T07:00:00Z',
      questionIds: [uuid],
    });
    expect(bad.success).toBe(false);
  });

  it('mã tham gia: tự viết hoa, từ chối ký tự dễ nhầm như 0 và O (FR-31)', () => {
    expect(joinExamSchema.parse({ code: ' abcd2345 ' }).code).toBe('ABCD2345');
    expect(joinExamSchema.safeParse({ code: 'ABCD0OIL' }).success).toBe(false);
  });

  it('loại client mặc định là WEB (FR-85)', () => {
    expect(startAttemptSchema.parse({}).client).toBe('WEB');
    expect(startAttemptSchema.safeParse({ client: 'MOBILE' }).success).toBe(false);
  });
});

describe('sự kiện giám sát (FR-61..63, FR-68, SEC-11, SEC-14)', () => {
  it('nhận sự kiện của client', () => {
    expect(createExamEventSchema.safeParse({ type: 'FOCUS_LOST' }).success).toBe(true);
    expect(createExamEventSchema.safeParse({ type: 'FOCUS_GAINED' }).success).toBe(true);
  });

  it('từ chối sự kiện của hệ thống do client gửi', () => {
    expect(createExamEventSchema.safeParse({ type: 'ATTEMPT_SUBMITTED' }).success).toBe(false);
    expect(createExamEventSchema.safeParse({ type: 'ATTEMPT_STARTED' }).success).toBe(false);
  });

  it('từ chối metadata quá lớn', () => {
    const big = {
      note: 'x'.repeat(200),
      a: 'y'.repeat(200),
      b: 'z'.repeat(200),
      c: 'w'.repeat(200),
      d: 'v'.repeat(200),
      e: 'u'.repeat(200),
    };
    expect(JSON.stringify(big).length).toBeGreaterThan(EVENT_METADATA_MAX_BYTES);
    expect(createExamEventSchema.safeParse({ type: 'FOCUS_LOST', metadata: big }).success).toBe(
      false,
    );
  });

  it('metadata nhỏ thì hợp lệ', () => {
    const ok = createExamEventSchema.safeParse({
      type: 'FOCUS_LOST',
      metadata: { reason: 'blur' },
    });
    expect(ok.success).toBe(true);
  });
});
