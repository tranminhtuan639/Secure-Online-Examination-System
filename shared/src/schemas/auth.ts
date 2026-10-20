import { z } from 'zod';

// Zod mặc định bỏ các trường lạ, nên `role` do client gửi lên sẽ bị loại (SEC-03).
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

// FR-04
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

// Mã vai trò (nâng Student lên Lecturer). Không bao giờ nhận `role` từ client.
export const redeemRoleCodeSchema = z.object({
  code: z.string().trim().min(8).max(64),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RedeemRoleCodeInput = z.infer<typeof redeemRoleCodeSchema>;
