import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Mã vai trò (nâng quyền giảng viên). Không bao giờ nhận `role` từ client.
export const redeemRoleCodeSchema = z.object({
  code: z.string().trim().min(8).max(64),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RedeemRoleCodeInput = z.infer<typeof redeemRoleCodeSchema>;
