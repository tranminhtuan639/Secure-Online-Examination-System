import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ATTEMPT_STATUSES,
  CLIENT_TYPES,
  EVENT_TYPES,
  EXAM_STATUSES,
  ROLES,
  changePasswordSchema,
  createExamEventSchema,
  createExamSchema,
  createQuestionSchema,
  joinExamSchema,
  loginSchema,
  redeemRoleCodeSchema,
  refreshSchema,
  registerSchema,
  saveAnswerSchema,
  startAttemptSchema,
  updateProfileSchema,
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
registry.register('UpdateProfileInput', updateProfileSchema);
registry.register('ChangePasswordInput', changePasswordSchema);
registry.register('RedeemRoleCodeInput', redeemRoleCodeSchema);
registry.register('QuestionInput', createQuestionSchema);
registry.register('CreateExamInput', createExamSchema);
registry.register('JoinExamInput', joinExamSchema);
registry.register('StartAttemptInput', startAttemptSchema);
registry.register('SaveAnswerInput', saveAnswerSchema);
registry.register('CreateExamEventInput', createExamEventSchema);

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
  z.object({
    accessToken: z.string().describe('Hết hạn sau 15 phút'),
    refreshToken: z.string().describe('Hết hạn sau 7 ngày, server chỉ lưu hash'),
    user: UserDto,
  }),
);

// P1 không rotation (FR-06 là P2): refresh token giữ nguyên, chỉ cấp access token mới.
const RefreshResponse = registry.register('RefreshResponse', z.object({ accessToken: z.string() }));

// Câu hỏi của giảng viên. Có isCorrect vì chỉ chủ câu hỏi mới xem được (SEC-04).
const QuestionDto = registry.register(
  'Question',
  z.object({
    id: z.string().uuid(),
    content: z.string(),
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
    status: z.enum(EXAM_STATUSES),
    questionCount: z.number().int(),
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
    attemptStatus: z.enum(ATTEMPT_STATUSES),
  }),
);

// Quan trọng (SEC-05): đề gửi cho sinh viên KHÔNG có đáp án đúng
const AttemptQuestion = z.object({
  id: z.string().uuid(),
  content: z.string(),
  options: z.array(z.object({ id: z.string().uuid(), content: z.string() })),
});

const SavedAnswer = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable(),
});

const AttemptStartResponse = registry.register(
  'AttemptStartResponse',
  z.object({
    attemptId: z.string().uuid(),
    serverTime: z.string().datetime().describe('Giờ server, client dùng để hiển thị đồng hồ'),
    deadline: z.string().datetime(),
    questions: z.array(AttemptQuestion),
    savedAnswers: z.array(SavedAnswer),
  }),
);

const AttemptState = registry.register(
  'AttemptState',
  z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    status: z.enum(ATTEMPT_STATUSES),
    serverTime: z.string().datetime(),
    deadline: z.string().datetime().nullable(),
    secondsLeft: z.number().int().nullable(),
  }),
);

const AttemptResult = registry.register(
  'AttemptResult',
  z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    examTitle: z.string(),
    status: z.enum(ATTEMPT_STATUSES),
    score: z.number().nullable(),
    submittedAt: z.string().datetime().nullable(),
  }),
);

// Đáp án đúng chỉ xuất hiện ở đây, và chỉ khi kỳ thi đã đóng (SEC-05)
const AttemptReview = registry.register(
  'AttemptReview',
  z.object({
    result: AttemptResult,
    review: z
      .array(
        z.object({
          questionId: z.string().uuid(),
          selectedOptionId: z.string().uuid().nullable(),
          correctOptionId: z.string().uuid(),
        }),
      )
      .nullable()
      .describe('null cho tới khi kỳ thi đóng'),
  }),
);

const EventCounts = z
  .record(z.enum(EVENT_TYPES), z.number().int())
  .describe('Số lần xảy ra theo loại sự kiện');

const LecturerAttemptSummary = registry.register(
  'LecturerAttemptSummary',
  z.object({
    attemptId: z.string().uuid(),
    student: z.object({ id: z.string().uuid(), displayName: z.string(), email: z.string() }),
    status: z.enum(ATTEMPT_STATUSES),
    score: z.number().nullable(),
    startedAt: z.string().datetime().nullable(),
    submittedAt: z.string().datetime().nullable(),
    client: z
      .enum(CLIENT_TYPES)
      .nullable()
      .describe(
        'Loại client khai báo ở lần vào gần nhất. WEB nghĩa là KHÔNG có dữ liệu giám sát focus: ' +
          '0 sự kiện không có nghĩa là không vi phạm. DESKTOP chỉ là khai báo, không phải bằng chứng.',
      ),
    eventCounts: EventCounts,
  }),
);

const ExamEventDto = registry.register(
  'ExamEvent',
  z.object({
    id: z.string().uuid(),
    type: z.enum(EVENT_TYPES),
    clientOccurredAt: z.string().datetime().nullable(),
    receivedAt: z.string().datetime().describe('Giờ server nhận, là mốc đáng tin hơn'),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  }),
);

// ---------------------------------------------------------------------------
// Khai báo route
// ---------------------------------------------------------------------------
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Audience = 'PUBLIC' | 'STUDENT' | 'LECTURER' | 'AUTHENTICATED';
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
const examAttemptParams = z.object({
  id: z
    .string()
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' } }),
  attemptId: z
    .string()
    .uuid()
    .openapi({ param: { name: 'attemptId', in: 'path' } }),
});

// Mã yêu cầu trong phần note là mã của SRS v1.0. FR-07, FR-68, FR-85, SEC-14 và NFR-09 là
// mã đề xuất cho SRS v1.1 (xem docs/srs-v1.1-changes.md).

// --- Hệ thống ---------------------------------------------------------------
route({
  method: 'get',
  path: '/health',
  tag: 'System',
  summary: 'Kiểm tra backend còn sống',
  audience: 'PUBLIC',
  status: 'done',
  note: 'NFR-04. Dùng cho cron ping giữ Render không ngủ.',
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
  note: 'FR-01, FR-03. Bỏ qua mọi trường role do client gửi (SEC-03).',
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
  note: 'FR-02, FR-07, SEC-07. Rate limit, thông báo lỗi chung chung (không nói sai email hay sai mật khẩu).',
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
  summary: 'Cấp access token mới bằng refresh token',
  audience: 'PUBLIC',
  status: 'planned',
  note: 'FR-07, SEC-02. Client tự gọi khi access token sắp hết hạn để không bị văng giữa bài thi. Rotation là P2 (FR-06).',
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
  note: 'FR-02, FR-07, SEC-02.',
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
  note: 'FR-04.',
  responses: { 200: { description: 'OK', schema: UserDto } },
});
route({
  method: 'patch',
  path: '/api/v1/me',
  tag: 'Account',
  summary: 'Cập nhật tên hiển thị',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-04.',
  body: updateProfileSchema,
  responses: { 200: { description: 'OK', schema: UserDto } },
});
route({
  method: 'post',
  path: '/api/v1/me/password',
  tag: 'Account',
  summary: 'Đổi mật khẩu',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-04, SEC-01. Cần mật khẩu hiện tại. Nên thu hồi các refresh token còn lại.',
  body: changePasswordSchema,
  responses: {
    204: { description: 'Đã đổi mật khẩu' },
    401: { description: 'Mật khẩu hiện tại sai' },
  },
});
route({
  method: 'post',
  path: '/api/v1/me/role-code',
  tag: 'Account',
  summary: 'Nhập mã vai trò để lên giảng viên',
  audience: 'AUTHENTICATED',
  status: 'planned',
  note: 'FR-10, FR-13, FR-14, SEC-06, SEC-07. Mã dùng một lần, tiêu thụ nguyên tử cùng lúc nâng quyền. Rate limit, lỗi chung chung. Trả token mới để vai trò có hiệu lực.',
  body: redeemRoleCodeSchema,
  responses: { 200: { description: 'OK', schema: TokenResponse } },
});

// --- Ngân hàng câu hỏi ------------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/questions',
  tag: 'Questions',
  summary: 'Tạo câu hỏi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-20, FR-21.',
  body: createQuestionSchema,
  responses: { 201: { description: 'Đã tạo', schema: QuestionDto } },
});
route({
  method: 'get',
  path: '/api/v1/questions',
  tag: 'Questions',
  summary: 'Danh sách câu hỏi của tôi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-20, FR-22, SEC-04. Chỉ trả câu hỏi do chính giảng viên tạo.',
  responses: { 200: { description: 'OK', schema: z.array(QuestionDto) } },
});
route({
  method: 'get',
  path: '/api/v1/questions/{id}',
  tag: 'Questions',
  summary: 'Chi tiết câu hỏi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-20, FR-22, SEC-04.',
  params: idParam,
  responses: {
    200: { description: 'OK', schema: QuestionDto },
    404: { description: 'Không tìm thấy' },
  },
});
route({
  method: 'put',
  path: '/api/v1/questions/{id}',
  tag: 'Questions',
  summary: 'Sửa câu hỏi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-20, FR-22, SEC-04. Thay toàn bộ nội dung và các lựa chọn.',
  params: idParam,
  body: createQuestionSchema,
  responses: {
    200: { description: 'OK', schema: QuestionDto },
    404: { description: 'Không tìm thấy' },
  },
});
route({
  method: 'delete',
  path: '/api/v1/questions/{id}',
  tag: 'Questions',
  summary: 'Xóa câu hỏi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-20, FR-22, SEC-04. Câu hỏi đã nằm trong kỳ thi thì từ chối (409) để không làm hỏng bài thi.',
  params: idParam,
  responses: {
    204: { description: 'Đã xóa' },
    404: { description: 'Không tìm thấy' },
    409: { description: 'Câu hỏi đang được dùng trong kỳ thi' },
  },
});

// --- Kỳ thi (giảng viên) ----------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/exams',
  tag: 'Exams',
  summary: 'Tạo kỳ thi (hệ thống tự sinh mã tham gia)',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-30, FR-31. Chỉ chọn được câu hỏi của chính mình.',
  body: createExamSchema,
  responses: { 201: { description: 'Đã tạo', schema: ExamDto } },
});
route({
  method: 'get',
  path: '/api/v1/exams',
  tag: 'Exams',
  summary: 'Danh sách kỳ thi của tôi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-32, FR-80, SEC-04.',
  responses: { 200: { description: 'OK', schema: z.array(ExamDto) } },
});
route({
  method: 'get',
  path: '/api/v1/exams/{id}',
  tag: 'Exams',
  summary: 'Chi tiết kỳ thi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-33, SEC-04. Chỉ chủ kỳ thi.',
  params: idParam,
  responses: {
    200: { description: 'OK', schema: ExamDto },
    404: { description: 'Không tìm thấy' },
  },
});
route({
  method: 'post',
  path: '/api/v1/exams/{id}/close',
  tag: 'Exams',
  summary: 'Đóng kỳ thi sớm',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-32, FR-33, SEC-04. Các lượt IN_PROGRESS quá hạn được đóng và chấm khi đọc (FR-46).',
  params: idParam,
  responses: {
    200: { description: 'Đã đóng', schema: ExamDto },
    404: { description: 'Không tìm thấy' },
  },
});

// --- Kỳ thi (sinh viên) -----------------------------------------------------
route({
  method: 'post',
  path: '/api/v1/exams/join',
  tag: 'Exams',
  summary: 'Nhập mã tham gia kỳ thi',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-40, FR-41, SEC-07. Rate limit chặt. Biết mã chưa có nghĩa là xem được đề. Gọi lại thì trả lượt thi đã có.',
  body: joinExamSchema,
  responses: {
    200: { description: 'Đã tạo (hoặc tìm lại) lượt làm bài', schema: JoinExamResponse },
    409: { description: 'Kỳ thi chưa mở, đã đóng hoặc đã bị đóng sớm' },
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
  note: 'FR-42, FR-43, FR-47, FR-85. Server tính deadline, không đặt lại khi vào lại. Đề không kèm đáp án đúng (SEC-05). Ghi loại client (WEB/DESKTOP) của lần vào này.',
  params: idParam,
  body: startAttemptSchema,
  responses: {
    200: { description: 'OK', schema: AttemptStartResponse },
    409: { description: 'Đã nộp hoặc đã hết giờ' },
  },
});
route({
  method: 'get',
  path: '/api/v1/attempts/{id}',
  tag: 'Attempts',
  summary: 'Trạng thái lượt thi và thời gian còn lại',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-46, FR-47, FR-48, SEC-04. Nếu đã quá hạn thì đóng và chấm lượt thi ngay khi đọc, nhất quán với mọi API đọc trạng thái khác.',
  params: idParam,
  responses: { 200: { description: 'OK', schema: AttemptState } },
});
route({
  method: 'put',
  path: '/api/v1/attempts/{id}/answers',
  tag: 'Attempts',
  summary: 'Lưu đáp án một câu',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-44, SEC-03, SEC-12. Từ chối sau deadline hoặc sau khi lượt thi đã đóng.',
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
  note: 'FR-45, FR-50, SEC-12. Chuyển trạng thái có điều kiện trong database. Nộp lần hai trả 409, không chấm lại.',
  params: idParam,
  responses: {
    200: { description: 'Đã chấm điểm', schema: AttemptResult },
    409: { description: 'Đã nộp trước đó hoặc đã hết giờ' },
  },
});
route({
  method: 'get',
  path: '/api/v1/attempts/me',
  tag: 'Attempts',
  summary: 'Lịch sử làm bài của tôi',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-51, SEC-04. Chỉ trả lượt của chính sinh viên. Lượt quá hạn được đóng và chấm khi đọc (FR-46).',
  responses: { 200: { description: 'OK', schema: z.array(AttemptResult) } },
});
route({
  method: 'get',
  path: '/api/v1/attempts/{id}/result',
  tag: 'Attempts',
  summary: 'Kết quả của tôi',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-51, SEC-04, SEC-05. Điểm xem được ngay sau khi nộp. Trường review (đáp án đúng) là null cho tới khi kỳ thi đóng.',
  params: idParam,
  responses: {
    200: { description: 'OK', schema: AttemptReview },
    409: { description: 'Chưa nộp bài' },
  },
});

// --- Sự kiện giám sát (Electron gửi lên) ------------------------------------
route({
  method: 'post',
  path: '/api/v1/attempts/{id}/events',
  tag: 'Events',
  summary: 'Gửi sự kiện giám sát',
  audience: 'STUDENT',
  status: 'planned',
  note: 'FR-60..63, FR-68, SEC-11, SEC-14. Chỉ nhận loại sự kiện của client. Server kiểm tra lượt thi thuộc user và đang IN_PROGRESS, tự đặt thời gian nhận. Rate limit, giới hạn kích thước metadata. FOCUS_GAINED chỉ gửi khi chuyển từ mất focus sang có focus.',
  params: idParam,
  body: createExamEventSchema,
  responses: {
    201: { description: 'Đã ghi sự kiện', schema: z.object({ id: z.string().uuid() }) },
    409: { description: 'Lượt thi không còn đang làm' },
    429: { description: 'Gửi quá nhiều sự kiện' },
  },
});

// --- Dashboard giảng viên ---------------------------------------------------
route({
  method: 'get',
  path: '/api/v1/exams/{id}/attempts',
  tag: 'Dashboard',
  summary: 'Danh sách lượt thi của kỳ thi, kèm điểm và số sự kiện',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-52, FR-64, FR-65, FR-81, FR-82, FR-83, SEC-13. Dashboard polling 3-5 giây. Lượt IN_PROGRESS quá hạn được đóng và chấm bằng thao tác có điều kiện trong database trước khi trả về (FR-46).',
  params: idParam,
  responses: {
    200: { description: 'OK', schema: z.array(LecturerAttemptSummary) },
    404: { description: 'Không tìm thấy' },
  },
});
route({
  method: 'get',
  path: '/api/v1/exams/{id}/attempts/{attemptId}/events',
  tag: 'Dashboard',
  summary: 'Sự kiện giám sát của một lượt thi',
  audience: 'LECTURER',
  status: 'planned',
  note: 'FR-64, FR-82, FR-83, SEC-13. Kiểm tra lượt thi thuộc kỳ thi và kỳ thi thuộc giảng viên. Sự kiện chỉ là dữ kiện, không kết luận gian lận.',
  params: examAttemptParams,
  responses: {
    200: { description: 'OK', schema: z.array(ExamEventDto) },
    404: { description: 'Không tìm thấy' },
  },
});
