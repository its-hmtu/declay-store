import { z } from 'zod';

const zoneField = z.enum(['all', 'domestic', 'international']);

export const createShippingMethodSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(255).nullable().optional(),
  zone: zoneField.optional(),
  fee: z.number().min(0),
  freeOver: z.number().min(0).nullable().optional(),
  estimatedDays: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateShippingMethodSchema = createShippingMethodSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const shippingMethodIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});
