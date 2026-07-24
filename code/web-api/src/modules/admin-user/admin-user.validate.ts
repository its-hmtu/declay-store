import { z } from 'zod';

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const roleField = z.enum(['super_admin', 'admin', 'editor']);

export const createAdminSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: passwordField,
  fullName: z.string().max(255).nullable().optional(),
  role: roleField.optional(),
  isActive: z.boolean().optional(),
});

export const updateAdminSchema = z
  .object({
    fullName: z.string().max(255).nullable().optional(),
    password: passwordField.optional(),
    role: roleField.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const adminIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type CreateAdminRequest = z.infer<typeof createAdminSchema>;
export type UpdateAdminRequest = z.infer<typeof updateAdminSchema>;
