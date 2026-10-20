import { z } from 'zod';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '../constants';

export const createQuestionSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  tag: z.string().trim().max(50).optional(),
  points: z.number().positive().max(100).default(1),
  options: z
    .array(z.object({ content: z.string().trim().min(1).max(500), isCorrect: z.boolean() }))
    .min(2)
    .max(8)
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'Phải có đúng một đáp án đúng',
    }),
});

export const createExamSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    durationMinutes: z.number().int().min(1).max(600),
    opensAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    shuffle: z.boolean().default(true),
    questionIds: z.array(z.string().uuid()).min(1),
  })
  .refine((v) => v.closesAt > v.opensAt, { message: 'Giờ đóng phải sau giờ mở' });

const joinCodePattern = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

export const joinExamSchema = z.object({
  code: z.string().trim().toUpperCase().regex(joinCodePattern, 'Mã tham gia không hợp lệ'),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type JoinExamInput = z.infer<typeof joinExamSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
