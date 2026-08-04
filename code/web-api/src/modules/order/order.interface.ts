import type { RequestHandler } from 'express';
import type { OrderStatus } from './order.entity';

export interface IOrderItem {
  id: number;
  orderId: number;
  variantId: number;
  quantity: number;
  priceAtPurchase: number;
  variantNameAtPurchase: string;
  productNameAtPurchase: string;
}

export interface IOrder {
  id: number;
  /** M-16: mã hiển thị cho khách (DC-YYMMDD-XXXX). Giao diện dùng mã này, không dùng id. */
  orderCode: string;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  discountCodeId: number | null;
  discountAmount: number;
  stripePaymentIntentId: string | null;
  shippingAddressId: number | null;
  notes: string | null;
  items?: IOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderData {
  userId?: number | null;
  guestSessionId?: string | null;
  ipAddr?: string | null;
  /** M-13: điểm đến GHN để chốt phí vận chuyển khi tạo đơn. */
  ghnDistrictId?: number | null;
  ghnWardCode?: string | null;
  ghnServiceId?: number | null;
  guest?: { name?: string; email?: string; phone?: string } | null;
  shippingAddressId?: number | null;
  shippingAddress?: {
    receiverName?: string; receiverPhone?: string; addressLine: string;
    ward: string; district: string; city: string; country?: string; postalCode?: string;
    ghnProvinceId?: number | null; ghnDistrictId?: number | null; ghnWardCode?: string | null;
  } | null;
  notes?: string;
  discountCode?: string;
  shippingMethodId?: number;
  paymentMethod?: 'cod' | 'stripe' | 'vnpay';
}

/** M-29d: kết quả huỷ đơn — huỷ ngay, hay tạo yêu cầu chờ admin duyệt. */
export interface CancelOutcome {
  outcome: 'cancelled' | 'cancel_requested';
  order: IOrder;
}

export interface IOrderService {
  createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string | null; paymentUrl?: string | null }>;
  findByGuestToken(token: string): Promise<IOrder>;
  getPublicSummaryByGuestToken(token: string): Promise<unknown>;
  adminGetById(orderId: number): Promise<IOrder>;
  markVnpayPaid(orderId: number): Promise<void>;
  returnOrder(orderId: number, reason: string): Promise<IOrder>;
  listByUser(userId: number, page: number, limit: number): Promise<{ rows: IOrder[]; count: number }>;
  findById(id: number, userId?: number): Promise<IOrder>;
  updateStatus(orderId: number, status: OrderStatus): Promise<IOrder>;
  markAsPaid(stripePaymentIntentId: string): Promise<void>;
  markPaymentFailed(stripePaymentIntentId: string): Promise<void>;
  cancelOrder(orderId: number, userId: number): Promise<CancelOutcome>;
  approveCancellation(requestId: number, adminId: number): Promise<{ status: string; refundId: number | null }>;
  rejectCancellation(requestId: number, adminId: number, reason?: string): Promise<void>;
  listPendingCancellations(): Promise<unknown[]>;
  listAll(page: number, limit: number, status?: OrderStatus): Promise<{ rows: IOrder[]; count: number }>;
}

export interface IOrderController {
  createCheckout: RequestHandler;
  lookupGuestOrder: RequestHandler;
  adminReturnOrder: RequestHandler;
  listMyOrders: RequestHandler;
  getOrder: RequestHandler;
  cancelOrder: RequestHandler;
  adminListOrders: RequestHandler;
  adminUpdateStatus: RequestHandler;
}
