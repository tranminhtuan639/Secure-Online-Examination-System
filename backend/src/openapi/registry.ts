import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ATTEMPT_STATUSES,
  EXAM_STATUSES,
  ROLES,
  createExamSchema,
  createQuestionSchema,
  joinExamSchema,
  loginSchema,
  redeemRoleCodeSchema,
  refreshSchema,
  registerSchema,
  saveAnswerSchema,
} from '@exam/shared';

// Phải gọi trước khi gắn tên cho schema (.openapi / registry.register)
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ---------------------------------------------------------------------------
// Schema vào (dùng chung với backend và web, nằm trong shared/)
// ---------------------------------------------------------------------------
registry.register('RegisterInput', registerSchema);
registry.register('LoginInput', loginSchema);
registry.register('RefreshInput', refreshSchema);
registry.register('RedeemRoleCodeInput', redeemRoleCodeSchema);
registry.register('CreateQuestionInput', createQuestionSchema);
registry.register('CreateExamInput', createExamSchema);
registry.register('JoinExamInput', joinExamSchema);
registry.register('SaveAnswerInput', saveAnswerSchema);

// ---------------------------------------------------------------------------
// Schema ra (response). Khi API thật có field mới thì sửa tại đây trong cùng PR.
// ---------------------------------------------------------------------------
const ErrorResponse = registry.register(
  'ErrorResponse',
  z.object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

const UserDto = registry.register(
  'User',
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: z.enum(ROLES),
  }),
);

const TokenResponse = registry.register(
  'TokenResponse',
  z.object({ accessToken: z.string(), refreshToken: z.string(), user: UserDto }),
);

const RefreshResponse = registry.register(
  'RefreshResponse',
  z.object({ accessToken: z.string(), refreshToken: z.string() }),
);

const QuestionDto = registry.register(
  'Question',
  z.object({
    id: z.string().uuid(),
    content: z.string(),
    tag: z.string().nullable(),
    points: z.number(),
    options: z.array(
      z.object({ id: z.string().uuid(), content: z.string(), isCorrect: z.boolean() }),
    ),
  }),
);

const ExamDto = registry.register(
  'Exam',
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    joinCode: z.string().describe('Chỉ giảng viên chủ kỳ thi mới thấy'),
    opensAt: z.string().datetime(),
    closesAt: z.string().datetime(),
    durationMinutes: z.number().int(),
    shuffle: z.boolean(),
    status: z.enum(EXAM_STATUSES),
  }),
);

const JoinExamResponse = registry.register(
  'JoinExamResponse',
  z.object({
    attemptId: z.string().uuid(),
    examTitle: z.string(),
    opensAt: z.string().datetime(),
    closesAt: z.string().datetime(),
    durationMinutes: z.number().int(),
  }),
);

// Quan trọng (SEC-06): đề gửi cho sinh viên KHÔNG có trường isCorrect
const AttemptStartResponse = registry.register(
  'AttemptStartResponse',
  z.object({
    attemptId: z.string().uuid(),
    serverTime: z.string().datetime().describe('Giờ server, client dùng để hiển thị đồng hồ'),
    deadline: z.string().datetime(),
    questions: z.array(
      z.object({
        id: z.string().uuid(),
        content: z.string(),
        options: z.array(z.object({ id: z.string().uuid(), content: z.string() })),
      }),
    ),
    savedAnswers: z.array(
      z.object({ questionId: z.string().uuid(), selectedOptionId: z.string().uuid().nullable() }),
    ),
  }),
);

const AttemptResult = registry.register(
  'AttemptResult',
  z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    status: z.enum(ATTEMPT_STATUSES),
    score: z.number().nullable(),
    submittedAt: z.string().datetime().nullable(),
  }),
);

// ---------------------------------------------------------------------------
// Khai báo route
// ---------------------------------------------------------------------------
type Method = 'get' | 'post' | 'put' | 'delete';
type Audience = 'PUBLIC' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'AUTHENTICATED';
type ResponseDef = { description: string; schema?: z.ZodTypeAny };

interface RouteDef {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  audience: Audience;
  /** 'done' = đã có code thật, 'planned' = hợp đồng đã chốt nhưng chưa làm */
  status: 'done' | 'planned';
  note?: string;
  params?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  responses: Record<number, ResponseDef>;
}

const errorContent = { 'application/json': { schema: ErrorResponse } };

function route(def: RouteDef) {
  const secured = def.audience !== 'PUBLIC';
  const responses: Record<number, ResponseDef> = { ...def.responses };

  if (def.body || def.params) responses[400] ??= { description: 'Dữ liệu không hợp lệ' };
  if (secured) responses[401] ??= { description: 'Chưa đăng nhập hoặc token hết hạn' };
  if (secured && def.audience !== 'AUTHENTICATED') {
    responses[403] ??= { description: 'Không đủ quyền hoặc không phải chủ tài nguyên' };
  }

  const who =
    def.audience === 'PUBLIC'
      ? 'Không cần đăng nhập'
      : def.audience === 'AUTHENTICATED'
        ? 'Cần đăng nhập (mọi vai trò)'
        : `Vai trò: ${def.audience}`;
  const state = def.status === 'done' ? 'Đã làm' : 'Chưa làm (hợp đồng đã chốt)';
  const description = [`${who}. Trạng thái: ${state}.`, def.note].filter(Boolean).join(' ');

  registry.registerPath({
    method: def.method,
    path: def.path,
    tags: [def.tag],
    summary: def.summary,
    description,
    security: secured ? [{ bearerAuth: [] }] : [],
    request: {
      params: def.params,
      body: def.body
        ? { content: { 'application/json': { schema: def.body } }, required: true }
        : undefined,
    },
    responses: Object.fromEntries(
      Object.entries(responses).map(([code, r]) => [
        code,
        {
          description: r.description,
          content: r.schema
            ? { 'application/json': { schema: r.schema } }
            : Number(code) >= 400
              ? errorContent
              : undefined,
        },
      ]),
    ),
  });
}

const idParam = z.object({
  id: z
    .string()
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' } }),
});

// --- Hệ thống ---------------------------------------------------------------
route({
  method: 'get',
  path: '/health',
  tag: 'System',
  summary: 'Kiểm tra backend còn sống',
  audience: 'PUBLIC',
  status: 'done',
  note: 'Dùng cho cron ping giữ Render không ngủ.',
  responses: {
    200: {
      description: 'OK',
      schema: z.object({ status: z.literal('ok'), time: z.string().datetime() }),
    },
  },
});

// --- Auth -------------------------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/auth/register',
  tag: 'Auth',
  summary: 'Đăng ký (vai trò mặc định STUDENT)',
  audience: 'PUBLIC',
  status: 'planned',
  note: 'FR-01. Rate limit.',
  body: registerSchema,
  responses: {
    201: { description: 'Đã tạo tài khoản', schema: TokenResponse },
    409: { description: 'Email đã tồn tại' },
  },
});
route({
  method: 'post',
  path: '/api/v1/auth/login',
  tag: 'Auth',
  summary: 'Đăng nhập',
  audience: 'PUBLIC',
  status: 'planned',
  note: 'FR-02. Rate limit, thông báo lỗi chung chung (không nói sai email hay sai mật khẩu).',
  body: loginSchema,
  responses: {
    200: { description: 'OK', schema: TokenResponse },
    401: { description: 'Sai email hoặc mật khẩu' },
    429: { description: 'Thử quá nhiều lần' },
  },
});
route({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tag: 'Auth',
  summary: 'Làm mới token (rotation)',
  audience: 'PUBLIC',
  status: 'planned',
  note: 'FR-03, SEC-02. Dùng lại refresh token cũ sẽ thu hồi cả chuỗi phiên.',
  body: refreshSchema,
  responses: {
    200: { description: 'OK', schema: RefreshResponse },
    401: { description: 'Refresh token sai, hết hạn hoặc đã bị thu hồi' },
  },
});
route({
  method: 'post',
  path: '/api/v1/auth/logout',
  tag: 'Auth',
  summary: 'Đăng xuất (thu hồi refresh token)',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-04.',
  body: refreshSchema,
  responses: { 204: { description: 'Đã đăng xuất' } },
});

// --- Tài khoản --------------------------------------------------------------
route({
  method: 'get',
  path: '/api/v1/me',
  tag: 'Account',
  summary: 'Thông tin tài khoản hiện tại',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-05.',
  responses: { 200: { description: 'OK', schema: UserDto } },
});
route({
  method: 'post',
  path: '/api/v1/me/role-code',
  tag: 'Account',
  summary: 'Nhập mã vai trò để lên giảng viên',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-10..13, SEC-15. Mã dùng một lần, rate limit. Trả token mới để vai trò có hiệu lực.',
  body: redeemRoleCodeSchema,
  responses: { 200: { description: 'OK', schema: TokenResponse } },
});

// --- Ngân hàng câu hỏi ------------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/questions',
  tag: 'Questions',
  summary: 'Tạo câu hỏi',
  audience: 'TEACHER',
  status: 'planned',
  note: 'FR-20.',
  body: createQuestionSchema,
  responses: { 201: { description: 'Đã tạo', schema: QuestionDto } },
});
route({
  method: 'get',
  path: '/api/v1/questions',
  tag: 'Questions',
  summary: 'Danh sách câu hỏi của tôi',
  audience: 'TEACHER',
  status: 'planned',
  note: 'FR-22. Chỉ trả câu hỏi do chính giảng viên tạo.',
  responses: { 200: { description: 'OK', schema: z.array(QuestionDto) } },
});

// --- Kỳ thi -----------------------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/exams',
  tag: 'Exams',
  summary: 'Tạo kỳ thi (hệ thống tự sinh mã tham gia)',
  audience: 'TEACHER',
  status: 'planned',
  note: 'FR-30..32.',
  body: createExamSchema,
  responses: { 201: { description: 'Đã tạo', schema: ExamDto } },
});
route({
  method: 'get',
  path: '/api/v1/exams/{id}',
  tag: 'Exams',
  summary: 'Chi tiết kỳ thi',
  audience: 'TEACHER',
  status: 'planned',
  note: 'FR-35. Chỉ chủ kỳ thi.',
  params: idParam,
  responses: {
    200: { description: 'OK', schema: ExamDto },
    404: { description: 'Không tìm thấy' },
  },
});
route({
  method: 'post',
  path: '/api/v1/exams/join',
  tag: 'Exams',
  summary: 'Nhập mã tham gia kỳ thi',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-40, FR-41, SEC-16. Rate limit chặt. Biết mã chưa có nghĩa là xem được đề.',
  body: joinExamSchema,
  responses: {
    200: { description: 'Đã tạo (hoặc tìm lại) lượt làm bài', schema: JoinExamResponse },
    409: { description: 'Kỳ thi chưa mở, đã đóng hoặc đang bị khóa' },
  },
});

// --- Làm bài ----------------------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/attempts/{id}/start',
  tag: 'Attempts',
  summary: 'Bắt đầu làm bài (hoặc tiếp tục lượt đang làm)',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-42, FR-43, FR-47. Server tính deadline. Đề không kèm đáp án đúng.',
  params: idParam,
  responses: { 200: { description: 'OK', schema: AttemptStartResponse } },
});
route({
  method: 'put',
  path: '/api/v1/attempts/{id}/answers',
  tag: 'Attempts',
  summary: 'Lưu đáp án một câu (autosave)',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-44. Từ chối sau deadline.',
  params: idParam,
  body: saveAnswerSchema,
  responses: {
    204: { description: 'Đã lưu' },
    409: { description: 'Đã hết giờ hoặc đã nộp bài' },
  },
});
route({
  method: 'post',
  path: '/api/v1/attempts/{id}/submit',
  tag: 'Attempts',
  summary: 'Nộp bài',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-45, FR-50, SEC-08. Nộp lần hai trả 409, không chấm lại.',
  params: idParam,
  responses: {
    200: { description: 'Đã chấm điểm', schema: AttemptResult },
    409: { description: 'Đã nộp trước đó' },
  },
});
route({
  method: 'get',
  path: '/api/v1/attempts/me',
  tag: 'Attempts',
  summary: 'Lịch sử làm bài của tôi',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-51. Chỉ trả lượt của chính sinh viên.',
  responses: { 200: { description: 'OK', schema: z.array(AttemptResult) } },
});
