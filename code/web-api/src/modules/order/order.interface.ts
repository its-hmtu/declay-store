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
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  stripePaymentIntentId: string | null;
  shippingAddressId: number | null;
  notes: string | null;
  items?: IOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderData {
  userId: number;
  shippingAddressId: number;
  notes?: string;
}

export interface IOrderService {
  createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string }>;
  listByUser(userId: number, page: number, limit: number): Promise<{ rows: IOrder[]; count: number }>;
  findById(id: number, userId?: number): Promise<IOrder>;
  updateStatus(orderId: number, status: OrderStatus): Promise<IOrder>;
  markAsPaid(stripePaymentIntentId: string): Promise<void>;
  cancelOrder(orderId: number, userId: number): Promise<IOrder>;
  listAll(page: number, limit: number, status?: OrderStatus): Promise<{ rows: IOrder[]; count: number }>;
}

export interface IOrderController {
  createCheckout: RequestHandler;
  listMyOrders: RequestHandler;
  getOrder: RequestHandler;
  cancelOrder: RequestHandler;
  adminListOrders: RequestHandler;
  adminUpdateStatus: RequestHandler;
}
