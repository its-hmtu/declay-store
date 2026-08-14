import { z } from 'zod';

const slugField = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens')
  .max(100);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveDate must be YYYY-MM-DD');

export const createPageSchema = z.object({
  slug: slugField,
  title: z.string().min(1).max(255),
  body: z.string().min(1, 'Body is required'),
  isPublished: z.boolean().optional(),
  effectiveDate: dateField.nullable().optional(),
});

export const updatePageSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
    isPublished: z.boolean().optional(),
    effectiveDate: dateField.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const pageIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});

export const pageSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug').max(100),
});

export type CreatePageRequest = z.infer<typeof createPageSchema>;
export type UpdatePageRequest = z.infer<typeof updatePageSchema>;
