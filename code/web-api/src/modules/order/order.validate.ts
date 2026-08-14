import { z } from 'zod';

export const createOrderSchema = z.object({
  // Signed-in buyers reference a saved address; guests send the address inline.
  shippingAddressId: z.number().int().positive().optional(),
  shippingAddress: z.object({
    // Optional: defaults to the buyer's own name/phone (no duplicate 'receiver' fields).
    receiverName: z.string().min(2).max(120).optional(),
    receiverPhone: z.string().min(8).max(20).optional(),
    addressLine: z.string().min(3).max(255),
    ward: z.string().min(1).max(120),
    district: z.string().min(1).max(120),
    city: z.string().min(1).max(120),
    // M-13: mã địa giới GHN — thứ dùng để tính phí và tạo vận đơn.
    ghnProvinceId: z.number().int().positive().nullable().optional(),
    ghnDistrictId: z.number().int().positive().nullable().optional(),
    ghnWardCode: z.string().max(20).nullable().optional(),
    country: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
  discountCode: z.string().min(3).max(50).optional(),
  shippingMethodId: z.number().int().positive().optional(),
  // Điểm đến để hỏi phí GHN. Cố ý KHÔNG nhận số tiền từ client.
  ghnDistrictId: z.number().int().positive().optional(),
  ghnWardCode: z.string().max(20).optional(),
  // M-22: dịch vụ GHN khách chọn (nhanh/chuẩn/tiết kiệm).
  ghnServiceId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cod', 'stripe', 'vnpay']).optional(),
  guest: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().max(160),
    phone: z.string().min(8).max(20),
  }).optional(),
});

export const returnOrderSchema = z.object({
  reason: z.string().min(3).max(500),
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
