import { z } from 'zod';

// Register request validation
export const registerSchema = z.object({
  email: z.email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100, 'Username must be less than 100 characters').optional(),
  fullName: z.string().max(255, 'Full name must be less than 255 characters').optional().nullable(),
  phoneNumber: z.string().max(20, 'Phone number must be less than 20 characters').optional().nullable(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Login request validation
export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Type exports
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
