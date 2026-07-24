import { z } from 'zod';

const slugField = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens').max(170);

const base = {
  name: z.string().min(1).max(150),
  slug: slugField.optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  productIds: z.array(z.number().int().positive()).optional(),
};

export const createCollectionSchema = z.object(base);

export const updateCollectionSchema = z
  .object({
    name: base.name.optional(),
    slug: base.slug,
    description: base.description,
    isActive: base.isActive,
    sortOrder: base.sortOrder,
    productIds: base.productIds,
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const collectionIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});
