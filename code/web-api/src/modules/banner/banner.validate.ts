import { z } from 'zod';

export const createBannerSchema = z
  .object({
    title: z.string().max(255).nullable().optional(),
    subtitle: z.string().max(255).nullable().optional(),
    imageUrl: z.string().url('Image URL must be a valid URL').max(2048),
    // M-44: a relative path is valid here — a campaign banner links to
    // /products?campaignId=N, which z.string().url() would reject.
    linkUrl: z.string().max(2048).nullable().optional(),
    campaignId: z.number().int().positive().nullable().optional(),
    position: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) => !data.startsAt || !data.endsAt || data.endsAt.getTime() >= data.startsAt.getTime(),
    { message: 'endsAt must be on or after startsAt', path: ['endsAt'] },
  );

export const updateBannerSchema = z
  .object({
    title: z.string().max(255).nullable().optional(),
    subtitle: z.string().max(255).nullable().optional(),
    imageUrl: z.string().url('Image URL must be a valid URL').max(2048).optional(),
    // M-44: a relative path is valid here — a campaign banner links to
    // /products?campaignId=N, which z.string().url() would reject.
    linkUrl: z.string().max(2048).nullable().optional(),
    campaignId: z.number().int().positive().nullable().optional(),
    position: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
  .refine(
    (data) => !data.startsAt || !data.endsAt || data.endsAt.getTime() >= data.startsAt.getTime(),
    { message: 'endsAt must be on or after startsAt', path: ['endsAt'] },
  );

export const bannerIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type CreateBannerRequest = z.infer<typeof createBannerSchema>;
export type UpdateBannerRequest = z.infer<typeof updateBannerSchema>;
