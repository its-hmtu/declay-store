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
import { enqueueReservationExpiry } from '@/lib/reservation-queue';
import { Payment, Refund } from '@/modules/payment/payment.entity';
import ShippingMethod from '@/modules/shipping-method/shipping-method.entity';
import Address from '@/modules/address/address.entity';
import NotificationService from '@/modules/notification/notification.service';
import { resolveShippingZone, methodAppliesToZone, computeShippingFee, computeOrderTotal, statusTransitionError } from './order.pricing';
import { effectiveUnitPrice } from '@/lib/pricing';
import { initialOrderStatusFor } from './order.payment';
import { normalizeGuestContact, generateGuestToken } from './order.guest';
import { resolveCartOwner, ownerWhere } from '@/modules/cart/cart.owner';
import CampaignService from '@/modules/campaign/campaign.service';
import { queueOrderStatusEmail } from '@/lib/email-queue';
import type { IOrder, IOrderService, ICreateOrderData } from './order.interface';

const stripe = new Stripe(config.stripe.secretKey);

export default class OrderService implements IOrderService {
  private discountService = new DiscountService();
  private notificationService = new NotificationService();
  private campaignService = new CampaignService();

  async createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string | null }> {
    const { userId, guestSessionId, guest, shippingAddressId, shippingAddress, notes, discountCode, shippingMethodId, paymentMethod } = data;
    const method = paymentMethod ?? 'stripe';
    const isCod = method === 'cod';

    // M-01: the buyer is either a signed-in user or a guest session.
    const owner = resolveCartOwner(userId ?? null, guestSessionId ?? null);
    if (!owner) throw httpError(401, 'Sign in or provide a guest session to check out');
    const isGuest = !userId;
    const guestContact = isGuest ? normalizeGuestContact(guest) : null;
    if (isGuest && !guestContact) {
      throw httpError(400, 'Guest checkout requires a valid name, email and phone number');
    }

    const cart = await Cart.findOne({
      where: ownerWhere(owner),
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

    // Resolve the shipping address: saved address for members, inline address for guests.
    let resolvedAddressId: number | null = shippingAddressId ?? null;
    if (!resolvedAddressId) {
      if (!shippingAddress) throw httpError(400, 'A shipping address is required');
      // The buyer is the recipient by default — no separate receiver fields to fill in.
      const receiverName = shippingAddress.receiverName ?? guestContact?.name;
      const receiverPhone = shippingAddress.receiverPhone ?? guestContact?.phone;
      if (!receiverName || !receiverPhone) {
        throw httpError(400, 'A recipient name and phone number are required');
      }
      const created = await Address.create({
        ...shippingAddress,
        receiverName,
        receiverPhone,
        userId: userId ?? null,
      });
      resolvedAddressId = created.id;
    }

    // Validate stock before creating order
    for (const item of items) {
      if (!item.variant?.isActive) throw httpError(400, `Variant "${item.variant?.name}" is no longer available`);
      if (item.variant.stock < item.quantity) {
        throw httpError(400, `Insufficient stock for "${item.variant.name}". Available: ${item.variant.stock}`);
      }
    }

    // Pricing (increments 1 & 2): effective unit price = best of base / special / active campaign.
    const productIds = items.map((i: any) => i.variant.product?.id).filter((id: any): id is number => !!id);
    const campaignPct = await this.campaignService.getActiveDiscountPercents(productIds);
    const unitPriceOf = (item: any) => effectiveUnitPrice(item.variant.price, item.variant.specialPrice, campaignPct.get(item.variant.product?.id) ?? null);

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + unitPriceOf(item) * item.quantity,
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

    // W-15: resolve shipping fee (0 if no method, or subtotal reaches the free-over threshold)
    let shippingFee = 0;
    let resolvedShippingMethodId: number | null = null;
    if (shippingMethodId) {
      const method = await ShippingMethod.findByPk(shippingMethodId);
      if (!method || !method.isActive) throw httpError(400, 'Selected shipping method is not available');
      const address = resolvedAddressId ? await Address.findByPk(resolvedAddressId) : null;
      const zone = resolveShippingZone(address?.country);
      if (!methodAppliesToZone(method.zone, zone)) {
        throw httpError(400, 'Selected shipping method is not available for your address');
      }
      shippingFee = computeShippingFee(subtotal, method);
      resolvedShippingMethodId = method.id;
    }

    // totalAmount is the final amount charged (subtotal - discount + shipping)
    const totalAmount = computeOrderTotal(subtotal, discountAmount, shippingFee);

    // COD skips prepayment; only prepaid methods create a Stripe PaymentIntent.
    const paymentIntent = isCod
      ? null
      : await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // cents
          currency: 'usd',
          metadata: { userId: String(userId ?? ''), guest: String(isGuest) },
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
          userId: userId ?? null,
          guestName: guestContact?.name ?? null,
          guestEmail: guestContact?.email ?? null,
          guestPhone: guestContact?.phone ?? null,
          guestToken: isGuest ? generateGuestToken() : null,
          status: initialOrderStatusFor(method),
          subtotal,
          shippingFee,
          shippingMethodId: resolvedShippingMethodId,
          totalAmount,
          discountCodeId,
          discountAmount,
          stripePaymentIntentId: paymentIntent?.id ?? null,
          shippingAddressId: resolvedAddressId,
          notes,
        },
        { transaction: t },
      );

      await Payment.create(
        {
          orderId: newOrder.id,
          stripePaymentIntentId: paymentIntent?.id ?? null,
          method,
          provider: isCod ? 'cod' : 'stripe',
          amount: totalAmount,
          currency: 'usd',
          status: 'pending',
        },
        { transaction: t },
      );

      await OrderItem.bulkCreate(
        items.map((item: any) => ({
          orderId: newOrder.id,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchase: unitPriceOf(item),
          variantNameAtPurchase: item.variant.name,
          productNameAtPurchase: item.variant.product?.name ?? '',
        })),
        { transaction: t },
      );

      // COD is committed immediately, so empty the cart here — no payment webhook
      // will fire later to do it (prepaid orders are cleared in markAsPaid).
      if (isCod) await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      return newOrder;
    });

    // Start the reservation-expiry timer so abandoned checkouts release their stock (W-03).
    // COD orders are already committed (processing), so they must not auto-expire.
    if (!isCod) await enqueueReservationExpiry(order.id);

    // W-17: alert admins about variants that dropped to/below the low-stock threshold.
    const lowStock = await ProductVariant.findAll({
      where: { id: items.map((i: any) => i.variantId), stock: { [Op.lte]: config.notifications.lowStockThreshold } },
    });
    for (const v of lowStock) {
      await this.notificationService.notifyAdmins({
        type: 'low_stock', title: `Low stock: ${v.name}`,
        body: `Only ${v.stock} left in stock.`, link: '/admin/products',
      });
    }

    // COD has no payment webhook — notify admins of the new order to prepare/ship.
    if (isCod) {
      await this.notificationService.notifyAdmins({
        type: 'new_order', title: `New COD order #${order.id}`,
        body: `Total ${totalAmount}. Please prepare and ship.`, link: '/admin/orders',
      });
    }

    return { order: order.toJSON() as IOrder, clientSecret: paymentIntent?.client_secret ?? null };
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

    // W-08: shipping is a real, human action. Orders become 'shipped' only via the
    // shipment endpoint (which requires a carrier + tracking number), never here.
    if (status === 'shipped') {
      throw httpError(400, 'To mark an order shipped, create a shipment (carrier + tracking) via POST /admin/orders/:id/shipment.');
    }

    // W-21: order status is forward-only; terminal states are locked.
    const transitionError = statusTransitionError(order.status, status);
    if (transitionError) throw httpError(400, transitionError);

    const previousStatus = order.status;
    await order.update({ status });

    if (previousStatus !== status) {
      await queueOrderStatusEmail({ orderId: order.id, status });
      if (order.userId) await this.notificationService.notifyUser(order.userId, {
        type: 'order_status', title: `Order #${order.id} is now ${status}`, link: `/orders/${order.id}`,
      });
    }

    return order.toJSON() as IOrder;
  }

  /** M-01: guest order tracking — the token is the only credential a guest has. */
  async findByGuestToken(token: string): Promise<IOrder> {
    const order = await Order.findOne({
      where: { guestToken: token },
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) throw httpError(404, 'Order not found');
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
      // Guest carts are emptied when the COD order is created, so only signed-in
      // buyers still need their cart cleared here.
      if (locked.userId) {
        const cart = await Cart.findOne({ where: { userId: locked.userId }, transaction: t });
        if (cart) await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
      }

      // The reservation becomes a firm sale.
      await locked.update({ status: 'paid' }, { transaction: t });
      await Payment.update({ status: 'succeeded' }, { where: { stripePaymentIntentId }, transaction: t });
      return true;
    });

    // Duplicate or late webhook delivery: the order was already paid (or gone). No side effects.
    if (!transitioned) return;

    await queueOrderStatusEmail({ orderId: order.id, status: 'paid' });
    await this.notificationService.notifyAdmins({
      type: 'order_paid', title: `New paid order #${order.id}`,
      body: 'A new order has been paid and is ready to prepare.', link: `/admin/orders/${order.id}`,
    });
    if (order.userId) await this.notificationService.notifyUser(order.userId, {
      type: 'order_status', title: `Payment received for order #${order.id}`, link: `/orders/${order.id}`,
    });
  }

  async markPaymentFailed(stripePaymentIntentId: string): Promise<void> {
    await Payment.update({ status: 'failed' }, { where: { stripePaymentIntentId } });
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
      const refund = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
      const payment = await Payment.findOne({ where: { stripePaymentIntentId: order.stripePaymentIntentId } });
      await Refund.create({
        orderId: order.id,
        paymentId: payment?.id ?? null,
        stripeRefundId: refund.id,
        amount: Number(order.totalAmount),
        reason: 'order_cancelled',
        status: 'succeeded',
      });
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
