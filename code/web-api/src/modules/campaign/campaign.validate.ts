import { z } from 'zod';

const dateField = z.coerce.date();

const base = {
  name: z.string().min(1).max(150),
  description: z.string().max(500).nullable().optional(),
  discountPercent: z.number().positive('Discount must be > 0').max(100, 'Discount cannot exceed 100'),
  startsAt: dateField.nullable().optional(),
  endsAt: dateField.nullable().optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.number().int().positive()).optional(),
};

const dateOrder = (d: { startsAt?: Date | null; endsAt?: Date | null }) =>
  !d.startsAt || !d.endsAt || d.endsAt.getTime() >= d.startsAt.getTime();

export const createCampaignSchema = z.object(base).refine(dateOrder, {
  message: 'endsAt must be on or after startsAt',
  path: ['endsAt'],
});

export const updateCampaignSchema = z
  .object({
    name: base.name.optional(),
    description: base.description,
    discountPercent: base.discountPercent.optional(),
    startsAt: base.startsAt,
    endsAt: base.endsAt,
    isActive: base.isActive,
    productIds: base.productIds,
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' })
  .refine(dateOrder, { message: 'endsAt must be on or after startsAt', path: ['endsAt'] });

export const campaignIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});
