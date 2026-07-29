import Stripe from 'stripe';
import User from '@/modules/user/user.entity';
import { Op, literal, type Transaction } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import config from '@/config/env';
import { Order, OrderItem, type OrderStatus, OrderShipment } from './order.entity';
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
import { returnRejectionReason } from './order.returns';
import { buildVnpayPaymentUrl } from '@/modules/payment-provider/vnpay/vnpay.provider';
import GhnService from '@/modules/shipping-provider/ghn/ghn.service';
import { generateOrderCode } from './order.code';
import { maskEmail, formatAddressLine, countItems } from './order.summary';
import { normalizeVnd, assertPayableVnd, FxConfigurationError } from '@/modules/payment-provider/vnpay/vnpay.fx';
import { resolveCartOwner, ownerWhere } from '@/modules/cart/cart.owner';
import CampaignService from '@/modules/campaign/campaign.service';
import { queueOrderStatusEmail, queueOrderConfirmationEmail } from '@/lib/email-queue';
import type { IOrder, IOrderService, ICreateOrderData } from './order.interface';

const stripe = new Stripe(config.stripe.secretKey);

export default class OrderService implements IOrderService {
  private discountService = new DiscountService();
  private notificationService = new NotificationService();
  private campaignService = new CampaignService();

  async createFromCart(data: ICreateOrderData): Promise<{ order: IOrder; clientSecret: string | null; paymentUrl?: string | null }> {
    const { userId, guestSessionId, guest, shippingAddressId, shippingAddress, notes, discountCode, shippingMethodId, paymentMethod } = data;
    const method = paymentMethod ?? 'stripe';
    const isCod = method === 'cod';
    // M-12: VNPay redirects the buyer to its own page; no Stripe intent is created.
    const isVnpay = method === 'vnpay';

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

    // M-13: phí vận chuyển do GHN quyết định, hỏi LẠI ở server.
    // Không nhận số tiền từ client — nếu không, sửa payload là sửa được phí ship.
    let shippingFee = 0;
    let resolvedShippingMethodId: number | null = null;
    let ghnWeightGram: number | null = null;
    let ghnServiceId: number | null = null;

    const destinationDistrictId = data.ghnDistrictId ?? shippingAddress?.ghnDistrictId ?? null;
    const destinationWardCode = data.ghnWardCode ?? shippingAddress?.ghnWardCode ?? null;

    if (destinationDistrictId && destinationWardCode) {
      const quote = await new GhnService().quote({
        districtId: destinationDistrictId,
        wardCode: destinationWardCode,
        items: items.map((item: any) => ({
          quantity: item.quantity,
          weightGram: item.variant?.weightGram ?? null,
          lengthCm: item.variant?.lengthCm ?? null,
          widthCm: item.variant?.widthCm ?? null,
          heightCm: item.variant?.heightCm ?? null,
        })),
        subtotalVnd: subtotal,
        serviceId: data.ghnServiceId ?? null,
      });

      // Không báo được phí thì KHÔNG tạo đơn: thà chặn còn hơn nhận một đơn
      // mà cửa hàng chưa biết chi phí giao là bao nhiêu.
      if (!quote.available) {
        const message = quote.reason === 'district_not_served'
          ? 'GHN không giao tới quận/huyện này.'
          : quote.reason === 'parcel_too_heavy'
            ? 'Đơn hàng vượt giới hạn cân nặng của dịch vụ tiêu chuẩn.'
            : 'Chưa lấy được phí vận chuyển. Vui lòng thử lại.';
        throw httpError(400, message);
      }
      shippingFee = quote.feeVnd;
      ghnWeightGram = quote.weightGram;
      ghnServiceId = quote.serviceId;
    } else if (shippingMethodId) {
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
    const paymentIntent = isCod || isVnpay
      ? null
      : await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // cents
          currency: 'vnd',
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
          // M-16: mã hiển thị, sinh ngay khi tạo đơn. Chỉ số 4 ký tự ngẫu nhiên
          // nên xác suất trùng trong cùng một ngày rất thấp; ràng buộc UNIQUE ở
          // CSDL là chốt chặn cuối, và createFromCart được bọc trong transaction.
          orderCode: generateOrderCode(),
          // M-20: nhớ giỏ để xoá đúng giỏ đó khi thanh toán thành công.
          // Giỏ khách vãng lai gắn với session, không tra ngược được từ đơn.
          cartId: cart.id,
          shippingFee,
          shippingMethodId: resolvedShippingMethodId,
          // Chốt lại thông tin vận chuyển: biểu phí GHN đổi theo thời gian,
          // đơn cũ phải giữ đúng con số đã báo cho khách.
          ...(ghnWeightGram != null
            ? {
                shippingCarrier: 'ghn',
                shippingFeeQuoted: shippingFee,
                shippingWeightGram: ghnWeightGram,
                // M-22: lưu dịch vụ ĐÃ CHỌN để lúc tạo vận đơn dùng đúng nó.
                ghnServiceId: ghnServiceId,
                ghnServiceTypeId: config.ghn.serviceTypeId,
              }
            : {}),
          totalAmount,
          discountCodeId,
          discountAmount,
          stripePaymentIntentId: paymentIntent?.id ?? null,
          shippingAddressId: resolvedAddressId,
          notes,
        },
        { transaction: t },
      );

      // M-15: cửa hàng niêm yết thẳng VND — không còn quy đổi tiền tệ.
      // Vẫn CHỐT lại số tiền gửi cổng để IPN đối chiếu đúng con số đã hiển thị
      // cho khách, kể cả khi sau này giá sản phẩm thay đổi.
      let chargedVnd: number | null = null;
      if (isVnpay) {
        try {
          chargedVnd = assertPayableVnd(normalizeVnd(totalAmount));
        } catch (err) {
          if (err instanceof FxConfigurationError) throw httpError(400, err.message);
          throw err;
        }
      }

      await Payment.create(
        {
          orderId: newOrder.id,
          stripePaymentIntentId: paymentIntent?.id ?? null,
          method,
          provider: isCod ? 'cod' : isVnpay ? 'vnpay' : 'stripe',
          amount: totalAmount,
          currency: 'vnd',
          chargedAmount: chargedVnd,
          chargedCurrency: isVnpay ? 'VND' : null,
          fxRate: isVnpay ? 1 : null,   // M-15: niêm yết VND, không quy đổi
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
    // M-17: COD không có bước thanh toán nên gửi xác nhận ngay khi đặt.
    // Khách vãng lai chỉ có email này làm bằng chứng đơn hàng.
    if (isCod) {
      await queueOrderConfirmationEmail(order.id);
      await this.notificationService.notifyAdmins({
        type: 'new_order', title: `New COD order #${order.id}`,
        body: `Total ${totalAmount}. Please prepare and ship.`, link: '/admin/orders',
      });
    }

    // M-12: VNPay hands the buyer a redirect URL instead of a client secret.
    // Số tiền lấy từ BẢN CHỐT vừa ghi, không quy đổi lần hai — URL gửi khách,
    // DB và IPN vì thế luôn nói cùng một con số.
    let paymentUrl: string | null = null;
    if (isVnpay) {
      const snapshot = await Payment.findOne({ where: { orderId: order.id }, order: [['id', 'DESC']] });
      if (!snapshot?.chargedAmount) throw httpError(500, 'Missing VNPay amount snapshot');
      paymentUrl = buildVnpayPaymentUrl({
        orderId: order.id,
        amountVnd: Number(snapshot.chargedAmount),
        ipAddr: data.ipAddr ?? '127.0.0.1',
      });
    }

    return { order: order.toJSON() as IOrder, clientSecret: paymentIntent?.client_secret ?? null, paymentUrl };
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

  /**
   * M-23: admin xem CHI TIẾT một đơn — không scope theo user (admin thấy mọi
   * đơn). Trước đây admin dùng chung findById(id, userId) của khách, mà userId
   * của admin không khớp -> getUserId ném 401 -> FE xoá token admin -> đăng
   * xuất. Đây là handler riêng, kèm đủ quan hệ để trang chi tiết hiển thị.
   */
  async adminGetById(orderId: number): Promise<IOrder> {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] },
        { model: Address, as: 'shippingAddress' },
        { model: OrderShipment, as: 'shipment' },
      ],
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
    // M-06: remember when delivery happened — it starts the 7-day return window.
    await order.update({ status, ...(status === 'delivered' ? { deliveredAt: new Date() } : {}) });

    if (previousStatus !== status) {
      await queueOrderStatusEmail({ orderId: order.id, status });
      if (order.userId) await this.notificationService.notifyUser(order.userId, {
        type: 'order_status', title: `Order #${order.id} is now ${status}`, link: `/orders/${order.id}`,
      });
    }

    return order.toJSON() as IOrder;
  }

  /** M-06: accept a return within the 7-day window after delivery (BR-06). */
  async returnOrder(orderId: number, reason: string): Promise<IOrder> {
    const order = await Order.findByPk(orderId);
    if (!order) throw httpError(404, 'Order not found');

    const rejection = returnRejectionReason(order.status, order.deliveredAt ?? null);
    if (rejection) throw httpError(400, rejection);

    await order.update({ status: 'returned', returnedAt: new Date(), returnReason: reason });

    // Stock is NOT auto-restored: returned handmade pieces may not be resellable,
    // so an admin decides whether to put the item back on sale.
    await queueOrderStatusEmail({ orderId, status: 'returned' });
    if (order.userId) {
      await this.notificationService.notifyUser(order.userId, {
        type: 'order_status', title: `Order #${orderId} was returned`, link: `/orders/${orderId}`,
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

  /**
   * M-17/M-19: tóm tắt đơn để hiển thị trên trang cảm ơn.
   *
   * Chỉ gọi sau khi đã xác thực quyền xem: chữ ký VNPay hợp lệ, hoặc token đơn
   * hàng của khách vãng lai. Email được CHE bớt — đủ để khách nhận ra địa chỉ
   * của mình mà không phơi nguyên ra ngoài.
   */
  async getPublicSummary(orderId: number) {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderShipment, as: 'shipment' },
        { model: Address, as: 'shippingAddress' },
        { model: User, as: 'user', attributes: ['email'] },
      ],
    });
    if (!order) return null;

    const anyOrder = order as unknown as {
      items?: { productNameAtPurchase: string; variantNameAtPurchase: string | null; quantity: number; priceAtPurchase: number }[];
      shipment?: { trackingNumber: string | null; carrier: string | null; estimatedDeliveryAt: Date | null } | null;
      shippingAddress?: {
        receiverName: string; receiverPhone: string;
        addressLine: string; addressLine2: string | null;
        ward: string | null; district: string | null; city: string | null;
      } | null;
      user?: { email?: string } | null;
    };

    const items = (anyOrder.items ?? []).map((i) => ({
      productName: i.productNameAtPurchase,
      variantName: i.variantNameAtPurchase,
      quantity: i.quantity,
      unitPrice: Number(i.priceAtPurchase),
    }));
    const address = anyOrder.shippingAddress;

    // Order chưa có quan hệ tới ShippingMethod nên đọc riêng — include một model
    // chưa khai báo quan hệ sẽ ném lỗi lúc chạy mà TypeScript không bắt được.
    const shippingMethodName = order.shippingMethodId
      ? (await ShippingMethod.findByPk(order.shippingMethodId, { attributes: ['name'] }))?.name ?? null
      : null;

    return {
      orderCode: order.orderCode,
      status: order.status,
      orderDate: order.createdAt.toISOString(),
      /** Email đã che — dùng cho câu "đã gửi xác nhận tới ...". */
      maskedEmail: maskEmail(anyOrder.user?.email ?? order.guestEmail),
      items,
      itemCount: countItems(items),
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      shippingAddress: address
        ? {
            receiverName: address.receiverName,
            line: formatAddressLine(address),
          }
        : null,
      shippingMethodName: shippingMethodName
        ?? (anyOrder.shipment?.carrier ? `Giao bởi ${anyOrder.shipment.carrier}` : null),
      estimatedDeliveryAt: anyOrder.shipment?.estimatedDeliveryAt
        ? anyOrder.shipment.estimatedDeliveryAt.toISOString()
        : null,
      trackingNumber: anyOrder.shipment?.trackingNumber ?? null,
      carrier: anyOrder.shipment?.carrier ?? null,
      isGuest: order.userId == null,
    };
  }

  /**
   * M-19: tóm tắt đơn cho khách vãng lai, tra bằng token trong link.
   * Token là chuỗi 48 ký tự hex sinh ngẫu nhiên — nó chính là giấy thông hành.
   */
  async getPublicSummaryByGuestToken(token: string) {
    if (!token || token.length < 16) return null;
    const order = await Order.findOne({ where: { guestToken: token }, attributes: ['id'] });
    if (!order) return null;
    return this.getPublicSummary(order.id);
  }

  /**
   * M-20: dọn giỏ hàng đã sinh ra đơn, sau khi thanh toán thành công.
   *
   * Ưu tiên `cartId` đã chốt trên đơn — đây là cách DUY NHẤT tìm được giỏ của
   * khách vãng lai. Đơn cũ (trước migration 025) không có cartId nên vẫn dùng
   * đường cũ theo userId.
   */
  private async clearCartForOrder(order: Order, t: Transaction): Promise<void> {
    if (order.cartId) {
      await CartItem.destroy({ where: { cartId: order.cartId }, transaction: t });
      return;
    }
    if (order.userId) {
      const cart = await Cart.findOne({ where: { userId: order.userId }, transaction: t });
      if (cart) await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
    }
  }

  /** M-12: internal lookup for the VNPay IPN (no ownership check). */
  async findByIdRaw(id: number): Promise<Order | null> {
    return Order.findByPk(id);
  }

  /**
   * M-12: settle an order paid through VNPay. Mirrors markAsPaid but keyed by order id,
   * and idempotent — VNPay retries the IPN until it gets RspCode 00.
   */
  async markVnpayPaid(orderId: number): Promise<void> {
    const transitioned = await sequelize.transaction(async (t) => {
      const locked = await Order.findOne({ where: { id: orderId }, lock: t.LOCK.UPDATE, transaction: t });
      if (!locked || locked.status !== 'pending_payment') return false;

      if (locked.discountCodeId) await this.discountService.incrementUsage(locked.discountCodeId, t);

      // Stock was already reserved at order creation (W-03) — do not decrement again.
      // M-20: xoá theo cartId đã chốt trên đơn. Trước đây chỉ xoá khi có userId,
      // nên giỏ của khách vãng lai trả qua VNPay không bao giờ được dọn — họ
      // quay lại vẫn thấy hàng cũ và dễ đặt trùng.
      await this.clearCartForOrder(locked, t);
      await locked.update({ status: 'paid' }, { transaction: t });
      return true;
    });

    if (!transitioned) return;

    await queueOrderStatusEmail({ orderId, status: 'paid' });
    // M-17: xác nhận đầy đủ sản phẩm + số tiền, gửi cả cho khách vãng lai.
    await queueOrderConfirmationEmail(orderId);
    await this.notificationService.notifyAdmins({
      type: 'order_paid', title: `New paid order #${orderId}`,
      body: 'Paid via VNPay and ready to prepare.', link: `/admin/orders/${orderId}`,
    });
    const paid = await Order.findByPk(orderId, { attributes: ['id', 'userId'] });
    if (paid?.userId) await this.notificationService.notifyUser(paid.userId, {
      type: 'order_status', title: `Payment received for order #${orderId}`, link: `/orders/${orderId}`,
    });
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

      // M-20: xoá giỏ đã sinh ra đơn — đúng cho cả thành viên lẫn khách vãng lai.
      await this.clearCartForOrder(locked, t);

      // The reservation becomes a firm sale.
      await locked.update({ status: 'paid' }, { transaction: t });
      await Payment.update({ status: 'succeeded' }, { where: { stripePaymentIntentId }, transaction: t });
      return true;
    });

    // Duplicate or late webhook delivery: the order was already paid (or gone). No side effects.
    if (!transitioned) return;

    await queueOrderStatusEmail({ orderId: order.id, status: 'paid' });
    await queueOrderConfirmationEmail(order.id);
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
