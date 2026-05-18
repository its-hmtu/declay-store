import { z } from 'zod';

export const createVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required').max(100),
  price: z.number().positive('Price must be greater than 0'),
  stock: z.number().int().min(0, 'Stock cannot be negative').optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).max(10).optional(),
});

export const updateVariantSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const variantIdSchema = z.object({
  variantId: z
    .string()
    .regex(/^\d+$/, 'Variant ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const productIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Product ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type CreateVariantRequest = z.infer<typeof createVariantSchema>;
export type UpdateVariantRequest = z.infer<typeof updateVariantSchema>;
