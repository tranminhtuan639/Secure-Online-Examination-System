export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const EXAM_STATUSES = ['DRAFT', 'PUBLISHED', 'LOCKED', 'CLOSED'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const ATTEMPT_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

// Bỏ các ký tự dễ nhầm (0/O, 1/I/L) cho mã tham gia dễ đọc
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 8;
