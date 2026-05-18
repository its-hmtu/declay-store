import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.number().int().positive('Category is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  slug: z
    .string()
    .min(2)
    .max(280)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(5000).nullable().optional(),
});

export const updateProductSchema = z
  .object({
    categoryId: z.number().int().positive().optional(),
    name: z.string().min(2).max(255).optional(),
    slug: z
      .string()
      .min(2)
      .max(280)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().max(5000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const productIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const productSlugSchema = z.object({
  slug: z.string().min(1),
});

export const productListQuerySchema = z.object({
  categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default(1).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20).optional(),
  search: z.string().max(100).optional(),
});

export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;
