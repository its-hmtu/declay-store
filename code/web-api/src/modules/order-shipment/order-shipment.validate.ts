import { z } from 'zod';

export const orderIdParamSchema = z.object({
  orderId: z
    .string()
    .regex(/^\d+$/, 'Order ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const createShipmentSchema = z.object({
  carrier: z.string().min(1, 'Carrier is required').max(100),
  trackingNumber: z.string().min(1, 'Tracking number is required').max(255),
  shippedAt: z.coerce.date().optional(),
  estimatedDeliveryAt: z.coerce.date().nullable().optional(),
});

export const updateShipmentSchema = z
  .object({
    carrier: z.string().min(1).max(100).optional(),
    trackingNumber: z.string().min(1).max(255).optional(),
    shippedAt: z.coerce.date().optional(),
    estimatedDeliveryAt: z.coerce.date().nullable().optional(),
    deliveredAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const simulateTrackingSchema = z.object({
  status: z.string().min(1, 'Status is required').max(60),
});

export type CreateShipmentRequest = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentRequest = z.infer<typeof updateShipmentSchema>;
