import { z } from 'zod';

const codeField = z
  .string()
  .min(3, 'Code must be at least 3 characters')
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens, and underscores');

export const validateDiscountSchema = z.object({
  code: codeField,
});

export const createDiscountSchema = z.object({
  code: codeField,
  type: z.enum(['percent', 'fixed']),
  value: z.number().positive('Value must be greater than 0'),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
})
  .refine((data) => data.type !== 'percent' || data.value <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['value'],
  });

export const updateDiscountSchema = z
  .object({
    type: z.enum(['percent', 'fixed']).optional(),
    value: z.number().positive().optional(),
    minOrderAmount: z.number().min(0).optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
  .refine((data) => data.type !== 'percent' || data.value === undefined || data.value <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['value'],
  });

export const discountIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type ValidateDiscountRequest = z.infer<typeof validateDiscountSchema>;
export type CreateDiscountRequest = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountRequest = z.infer<typeof updateDiscountSchema>;
