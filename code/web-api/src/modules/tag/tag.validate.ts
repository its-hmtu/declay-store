import { z } from 'zod';

const slugField = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens').max(120);

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugField.optional(),
});

export const updateTagSchema = z
  .object({ name: z.string().min(1).max(100).optional(), slug: slugField.optional() })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const tagIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});
