// Theo SRS v1.0 và các quyết định v1.1. Không có vai trò Admin trong ứng dụng.
export const ROLES = ['STUDENT', 'LECTURER'] as const;
export type Role = (typeof ROLES)[number];

// ACTIVE: chưa bị đóng sớm. Việc kỳ thi có đang mở hay không do server tính từ opensAt/closesAt.
export const EXAM_STATUSES = ['ACTIVE', 'CLOSED'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const ATTEMPT_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

// Loại client của lượt thi. DESKTOP chỉ là khai báo từ client, không phải bằng chứng (SRS mục 8).
export const CLIENT_TYPES = ['WEB', 'DESKTOP'] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

// Sự kiện do Electron gửi lên (FR-61, FR-62)
export const CLIENT_EVENT_TYPES = [
  'SECURE_MODE_ENTER',
  'FOCUS_LOST',
  'FOCUS_GAINED',
  'SECURE_MODE_EXIT',
  'WINDOW_CLOSE_REQUESTED',
] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

// Sự kiện do chính server ghi (FR-60). Client không được phép gửi các loại này.
export const SYSTEM_EVENT_TYPES = [
  'ATTEMPT_STARTED',
  'ATTEMPT_SUBMITTED',
  'ATTEMPT_EXPIRED',
] as const;
export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number];

export const EVENT_TYPES = [...SYSTEM_EVENT_TYPES, ...CLIENT_EVENT_TYPES] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// Giới hạn cho endpoint nhận sự kiện (FR-68, SEC-14)
export const EVENT_METADATA_MAX_BYTES = 1024;

// Bỏ các ký tự dễ nhầm (0/O, 1/I/L) cho mã tham gia dễ đọc
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 8;
