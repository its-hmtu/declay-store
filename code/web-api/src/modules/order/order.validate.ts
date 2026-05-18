import { z } from 'zod';

export const createOrderSchema = z.object({
  shippingAddressId: z.number().int().positive('Shipping address is required'),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['paid', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export const orderIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Order ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const orderListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default(1).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default(20).optional(),
  status: z.enum(['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;
