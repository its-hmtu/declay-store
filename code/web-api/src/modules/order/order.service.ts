import Stripe from 'stripe';
import { Op, literal } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import config from '@/config/env';
import { Order, OrderItem, type OrderStatus } from './order.entity';
import { Cart, CartItem } from '@/modules/cart/cart.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import DiscountService from '@/modules/discount/discount.service';
import { enqueueFulfillment } from '@/lib/shipping-queue';
import { enqueueReservationExpiry } from '@/lib/reservation-queue';
import { queueOrderStatusEmail } from '@/lib/email-queue';
import type { IOrder, IOrderService, ICreateOrderData } from './order.interface';

const stripe = new Stripe(config.stripe.secretKey);

export default class OrderService implements IOrderService {
  private discountService = new DiscountService();

  async createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string }> {
    const { userId, shippingAddressId, notes, discountCode } = data;

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

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.variant.price) * item.quantity,
      0,
    );

    // Validate the code against the subtotal before charging anything
    let discountCodeId: number | null = null;
    let discountAmount = 0;
    if (discountCode) {
      const validated = await this.discountService.validateCode(discountCode, subtotal);
      discountCodeId = validated.discountCodeId;
      discountAmount = validated.discountAmount;
    }

    // totalAmount is the final amount charged (subtotal minus discount)
    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // cents
      currency: 'usd',
      metadata: { userId: String(userId) },
    });

    const order = await sequelize.transaction(async (t) => {
      // W-03: reserve stock atomically by decrementing with a floor. 0 rows affected means
      // another checkout took the last unit first — abort so we never oversell.
      for (const item of items) {
        const [affected] = await ProductVariant.update(
          { stock: literal(`stock - ${item.quantity}`) },
          { where: { id: item.variantId, stock: { [Op.gte]: item.quantity } }, transaction: t },
        );
        if (affected === 0) throw httpError(409, `Insufficient stock for "${item.variant.name}". Please try again.`);
      }

      const newOrder = await Order.create(
        {
          userId,
          status: 'pending_payment',
          totalAmount,
          discountCodeId,
          discountAmount,
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

    // Start the reservation-expiry timer so abandoned checkouts release their stock (W-03).
    await enqueueReservationExpiry(order.id);

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
    const previousStatus = order.status;
    await order.update({ status });

    if (previousStatus !== status) {
      await queueOrderStatusEmail({ orderId: order.id, status });
    }

    return order.toJSON() as IOrder;
  }

  async markAsPaid(stripePaymentIntentId: string): Promise<void> {
    const order = await Order.findOne({ where: { stripePaymentIntentId } });
    if (!order) return; // Webhook may fire before order is fully persisted — safe to ignore

    // Idempotency guard (W-01): Stripe may deliver `payment_intent.succeeded` more than once.
    // Re-read the row WITH A LOCK and only finalize when still `pending_payment`. Stock was
    // already reserved at order creation (W-03), so payment does NOT decrement stock again.
    const transitioned = await sequelize.transaction(async (t) => {
      const locked = await Order.findOne({
        where: { id: order.id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      // Already handled by an earlier (possibly duplicate) delivery — do nothing.
      if (!locked || locked.status !== 'pending_payment') return false;

      // Count the discount use now that payment succeeded
      if (locked.discountCodeId) {
        await this.discountService.incrementUsage(locked.discountCodeId, t);
      }

      // Clear the buyer's cart
      const cart = await Cart.findOne({ where: { userId: locked.userId }, transaction: t });
      if (cart) await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      // The reservation becomes a firm sale.
      await locked.update({ status: 'paid' }, { transaction: t });
      return true;
    });

    // Duplicate or late webhook delivery: the order was already paid (or gone). No side effects.
    if (!transitioned) return;

    await queueOrderStatusEmail({ orderId: order.id, status: 'paid' });

    // Start the automated fulfillment pipeline (processing → shipped → delivered)
    await enqueueFulfillment(order.id);
  }

  async cancelOrder(orderId: number, userId: number): Promise<IOrder> {
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) throw httpError(404, 'Order not found');

    if (!['pending_payment', 'paid'].includes(order.status)) {
      throw httpError(400, `Cannot cancel an order that is already ${order.status}`);
    }

    const wasPaid = order.status === 'paid';

    // Restore the reserved/sold stock and mark cancelled atomically (W-03). The status
    // transition also guards re-cancellation, so stock is never restored twice.
    await sequelize.transaction(async (t) => {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
      for (const item of items) {
        await ProductVariant.increment('stock', { by: item.quantity, where: { id: item.variantId }, transaction: t });
      }
      await order.update({ status: 'cancelled' }, { transaction: t });
    });

    // Refund only after the order is safely cancelled: a refund failure then leaves a
    // cancelled order for an admin to reconcile, rather than risking a double refund.
    if (order.stripePaymentIntentId && wasPaid) {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    }

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
