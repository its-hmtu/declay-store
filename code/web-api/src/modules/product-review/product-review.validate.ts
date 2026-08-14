import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z
    .string()
    .regex(/^\d+$/, 'Product ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const reviewIdParamSchema = z.object({
  reviewId: z
    .string()
    .regex(/^\d+$/, 'Review ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  title: z.string().max(200).nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  variantId: z.number().int().positive().nullable().optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(200).nullable().optional(),
    body: z.string().max(5000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const reviewListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;
