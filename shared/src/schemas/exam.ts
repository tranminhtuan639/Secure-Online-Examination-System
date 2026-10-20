import { z } from 'zod';
import {
  CLIENT_EVENT_TYPES,
  CLIENT_TYPES,
  EVENT_METADATA_MAX_BYTES,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
} from '../constants';

// FR-20, FR-21. Tag/chủ đề là P2 (FR-23) nên chưa có ở đây.
export const createQuestionSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  points: z.number().positive().max(100).default(1),
  options: z
    .array(z.object({ content: z.string().trim().min(1).max(500), isCorrect: z.boolean() }))
    .min(2)
    .max(8)
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'Phải có đúng một đáp án đúng',
    }),
});

// FR-30. Xáo câu hỏi, sinh đề theo tag là P2 (FR-34).
export const createExamSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    durationMinutes: z.number().int().min(1).max(600),
    opensAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    questionIds: z.array(z.string().uuid()).min(1),
  })
  .refine((v) => v.closesAt > v.opensAt, { message: 'Giờ đóng phải sau giờ mở' });

const joinCodePattern = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

export const joinExamSchema = z.object({
  code: z.string().trim().toUpperCase().regex(joinCodePattern, 'Mã tham gia không hợp lệ'),
});

// Client khai báo loại client khi vào làm bài. Chỉ để hiển thị, không phải bằng chứng.
export const startAttemptSchema = z.object({
  client: z.enum(CLIENT_TYPES).default('WEB'),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable(),
});

// Metadata tối giản và có giới hạn kích thước (FR-63, FR-68, SEC-14)
const eventMetadataSchema = z
  .record(z.string().max(50), z.union([z.string().max(200), z.number(), z.boolean()]))
  .refine((m) => JSON.stringify(m).length <= EVENT_METADATA_MAX_BYTES, {
    message: `Metadata tối đa ${EVENT_METADATA_MAX_BYTES} ký tự`,
  });

// Chỉ nhận các loại sự kiện của client. Sự kiện hệ thống do server tự ghi (SEC-11).
export const createExamEventSchema = z.object({
  type: z.enum(CLIENT_EVENT_TYPES),
  clientOccurredAt: z.coerce.date().optional(),
  metadata: eventMetadataSchema.optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type JoinExamInput = z.infer<typeof joinExamSchema>;
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type CreateExamEventInput = z.infer<typeof createExamEventSchema>;
