import Stripe from 'stripe';
import { sequelize } from '@/config/sequelize';
import config from '@/config/env';
import { Order, OrderItem, type OrderStatus } from './order.entity';
import { Cart, CartItem } from '@/modules/cart/cart.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import type { IOrder, IOrderService, ICreateOrderData } from './order.interface';

const stripe = new Stripe(config.stripe.secretKey);

export default class OrderService implements IOrderService {
  async createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string }> {
    const { userId, shippingAddressId, notes } = data;

    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: ProductVariant, as: 'variant', include: [{ model: Product, as: 'product' }] }],
        },
      ],
    });

    if (!cart) throw httpError(400, 'Cart is empty');
    const items = (cart as any).items as any[];
    if (!items || items.length === 0) throw httpError(400, 'Cart is empty');

    // Validate stock before creating order
    for (const item of items) {
      if (!item.variant?.isActive) throw httpError(400, `Variant "${item.variant?.name}" is no longer available`);
      if (item.variant.stock < item.quantity) {
        throw httpError(400, `Insufficient stock for "${item.variant.name}". Available: ${item.variant.stock}`);
      }
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.variant.price) * item.quantity,
      0,
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // cents
      currency: 'usd',
      metadata: { userId: String(userId) },
    });

    const order = await sequelize.transaction(async (t) => {
      const newOrder = await Order.create(
        {
          userId,
          status: 'pending_payment',
          totalAmount,
          stripePaymentIntentId: paymentIntent.id,
          shippingAddressId,
          notes,
        },
        { transaction: t },
      );

      await OrderItem.bulkCreate(
        items.map((item: any) => ({
          orderId: newOrder.id,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchase: Number(item.variant.price),
          variantNameAtPurchase: item.variant.name,
          productNameAtPurchase: item.variant.product?.name ?? '',
        })),
        { transaction: t },
      );

      return newOrder;
    });

    return { order: order.toJSON() as IOrder, clientSecret: paymentIntent.client_secret! };
  }

  async listByUser(userId: number, page: number, limit: number): Promise<{ rows: IOrder[]; count: number }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await Order.findAndCountAll({
      where: { userId },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { rows: rows.map((o) => o.toJSON() as IOrder), count };
  }

  async findById(id: number, userId?: number): Promise<IOrder> {
    const where: Record<string, unknown> = { id };
    if (userId) where.userId = userId;

    const order = await Order.findOne({
      where,
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) throw httpError(404, 'Order not found');
    return order.toJSON() as IOrder;
  }

  async updateStatus(orderId: number, status: OrderStatus): Promise<IOrder> {
    const order = await Order.findByPk(orderId);
    if (!order) throw httpError(404, 'Order not found');
    await order.update({ status });
    return order.toJSON() as IOrder;
  }

  async markAsPaid(stripePaymentIntentId: string): Promise<void> {
    const order = await Order.findOne({ where: { stripePaymentIntentId } });
    if (!order) return; // Webhook may fire before order is fully persisted — safe to ignore

    await sequelize.transaction(async (t) => {
      await order.update({ status: 'paid' }, { transaction: t });

      // Decrement stock for each ordered variant
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
      for (const item of items) {
        await ProductVariant.decrement('stock', { by: item.quantity, where: { id: item.variantId }, transaction: t });
      }

      // Clear the buyer's cart
      const cart = await Cart.findOne({ where: { userId: order.userId }, transaction: t });
      if (cart) await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
    });
  }

  async cancelOrder(orderId: number, userId: number): Promise<IOrder> {
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) throw httpError(404, 'Order not found');

    if (!['pending_payment', 'paid'].includes(order.status)) {
      throw httpError(400, `Cannot cancel an order that is already ${order.status}`);
    }

    if (order.stripePaymentIntentId && order.status === 'paid') {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    }

    await order.update({ status: 'cancelled' });
    return order.toJSON() as IOrder;
  }

  async listAll(page: number, limit: number, status?: OrderStatus): Promise<{ rows: IOrder[]; count: number }> {
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { rows: rows.map((o) => o.toJSON() as IOrder), count };
  }
}
