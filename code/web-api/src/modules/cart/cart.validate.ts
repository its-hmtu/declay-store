import { z } from 'zod';

export const addCartItemSchema = z.object({
  variantId: z.number().int().positive('Variant ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99),
});

export const cartItemIdSchema = z.object({
  itemId: z
    .string()
    .regex(/^\d+$/, 'Item ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type AddCartItemRequest = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;
