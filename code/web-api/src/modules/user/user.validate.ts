import { z } from 'zod';

// Update user request validation
export const updateUserSchema = z.object({
  email: z.email('Invalid email address').optional(),
  username: z.string().min(3).max(100).optional(),
  fullName: z.string().max(255).optional().nullable(),
  phoneNumber: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Change password validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;