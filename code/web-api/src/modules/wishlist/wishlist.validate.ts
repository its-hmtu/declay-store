import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  variantId: z.number().int().positive('Variant ID is required'),
});

export const wishlistItemIdSchema = z.object({
  itemId: z
    .string()
    .regex(/^\d+$/, 'Item ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type AddWishlistItemRequest = z.infer<typeof addWishlistItemSchema>;
