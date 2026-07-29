import { sequelize } from '@/config/sequelize';
import { Order, OrderItem, OrderShipment } from '@/modules/order/order.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Address from '@/modules/address/address.entity';
import GhnService from '@/modules/shipping-provider/ghn/ghn.service';
import { buildParcel } from '@/modules/shipping-provider/ghn/ghn.parcel';
import { mapGhnShipmentStatus, orderStatusFromGhn } from '@/modules/shipping-provider/ghn/ghn.status';
import { statusTransitionError } from '@/modules/order/order.pricing';
import { httpError } from '@/utils/http-error';
import { queueOrderStatusEmail, queueShipmentEmail } from '@/lib/email-queue';
import NotificationService from '@/modules/notification/notification.service';
import config from '@/config/env';
import { getShippingProvider } from '@/modules/shipping-provider';
import ShipmentTrackingService from '@/modules/shipment/shipment.service';
import type {
  IOrderShipment,
  IOrderShipmentService,
  ICreateShipmentData,
  IUpdateShipmentData,
} from './order-shipment.interface';

// Orders may only be shipped once they are paid and being prepared
const SHIPPABLE_STATUSES = ['paid', 'processing'];

export default class OrderShipmentService implements IOrderShipmentService {
  private notifications = new NotificationService();

  async getForUser(orderId: number, userId: number): Promise<IOrderShipment> {
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) throw httpError(404, 'Order not found');

    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'This order has not shipped yet');
    return shipment.toJSON() as IOrderShipment;
  }

  async getByOrder(orderId: number): Promise<IOrderShipment> {
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'Shipment not found');
    return shipment.toJSON() as IOrderShipment;
  }

  async create(orderId: number, data: ICreateShipmentData): Promise<IOrderShipment> {
    const order = await Order.findByPk(orderId);
    if (!order) throw httpError(404, 'Order not found');

    if (!SHIPPABLE_STATUSES.includes(order.status)) {
      throw httpError(400, `Cannot ship an order with status "${order.status}"`);
    }

    const existing = await OrderShipment.findOne({ where: { orderId } });
    if (existing) throw httpError(409, 'This order already has a shipment');

    const shipment = await sequelize.transaction(async (t) => {
      const created = await OrderShipment.create(
        {
          orderId,
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          shippedAt: data.shippedAt ?? new Date(),
          estimatedDeliveryAt: data.estimatedDeliveryAt ?? null,
        },
        { transaction: t },
      );

      await order.update({ status: 'shipped' }, { transaction: t });
      return created;
    });

    await queueOrderStatusEmail({
      orderId,
      status: 'shipped',
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt ? shipment.estimatedDeliveryAt.toISOString() : null,
    });
    // M-18: admin nhập mã vận đơn thủ công cũng phải báo cho khách như khi tạo
    // qua GHN — nếu không, cách nhập nào khách nhận được email sẽ tuỳ may rủi.
    await queueShipmentEmail(orderId);

    if (order.userId) await this.notifications.notifyUser(order.userId, {
      type: 'order_status', title: `Order #${orderId} has shipped`,
      body: `Tracking: ${shipment.carrier} ${shipment.trackingNumber}`, link: `/orders/${orderId}`,
    });

    return shipment.toJSON() as IOrderShipment;
  }

  async update(orderId: number, data: IUpdateShipmentData): Promise<IOrderShipment> {
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'Shipment not found');

    const markingDelivered = data.deliveredAt !== undefined && data.deliveredAt !== null;

    const updated = await sequelize.transaction(async (t) => {
      await shipment.update(data, { transaction: t });

      // Keep the order lifecycle in sync when delivery is recorded
      if (markingDelivered) {
        // M-06: stamp the delivery time — it starts the 7-day return window.
        await Order.update(
          { status: 'delivered', deliveredAt: data.deliveredAt ?? new Date() },
          { where: { id: orderId }, transaction: t },
        );
      }

      return shipment;
    });

    if (markingDelivered) {
      await queueOrderStatusEmail({ orderId, status: 'delivered' });
      const deliveredOrder = await Order.findByPk(orderId);
      if (deliveredOrder) {
        if (deliveredOrder.userId) await this.notifications.notifyUser(deliveredOrder.userId, {
          type: 'order_status', title: `Order #${orderId} has been delivered`, link: `/orders/${orderId}`,
        });
      }
    }

    return updated.toJSON() as IOrderShipment;
  }

  /**
   * M-13d: tạo vận đơn GHN cho một đơn hàng.
   *
   * Gọi khi admin xác nhận đơn — không phải lúc khách đặt. Đơn ảo, đơn hết
   * hàng, đơn khách huỷ vì thế không phát sinh cước.
   */
  async createGhnShipment(orderId: number): Promise<IOrderShipment> {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] },
        { model: Address, as: 'shippingAddress' },
      ],
    });
    if (!order) throw httpError(404, 'Order not found');
    if (!SHIPPABLE_STATUSES.includes(order.status)) {
      throw httpError(400, `Đơn ở trạng thái "${order.status}" chưa thể tạo vận đơn.`);
    }

    // Chặn tạo trùng ở phía mình TRƯỚC khi gọi GHN. `client_order_code` là lớp
    // bảo vệ thứ hai, nhưng không nên dựa vào nó để tiết kiệm một round-trip.
    const existing = await OrderShipment.findOne({ where: { orderId } });
    if (existing?.trackingNumber) {
      throw httpError(409, `Đơn này đã có vận đơn: ${existing.trackingNumber}`);
    }

    const address = (order as unknown as { shippingAddress?: Address }).shippingAddress;
    if (!address?.ghnDistrictId || !address?.ghnWardCode) {
      throw httpError(400, 'Địa chỉ giao hàng thiếu mã địa giới GHN. Đơn này đặt trước khi tích hợp GHN — cần nhập lại địa chỉ.');
    }

    const items = (order as unknown as { items?: (OrderItem & { variant?: ProductVariant })[] }).items ?? [];
    const parcel = buildParcel(items.map((i) => ({
      quantity: i.quantity,
      weightGram: i.variant?.weightGram ?? null,
      lengthCm: i.variant?.lengthCm ?? null,
      widthCm: i.variant?.widthCm ?? null,
      heightCm: i.variant?.heightCm ?? null,
    })));

    const created = await new GhnService().createShipment({
      orderCode: order.orderCode,
      // Đơn đã thanh toán trước thì GHN KHÔNG được thu hộ thêm đồng nào.
      isPrepaid: order.status === 'paid' || Boolean(order.stripePaymentIntentId),
      totalAmountVnd: Number(order.totalAmount),
      goodsValueVnd: Number(order.subtotal),
      receiver: {
        name: address.receiverName,
        phone: address.receiverPhone,
        address: [address.addressLine, address.addressLine2].filter(Boolean).join(', '),
        wardCode: String(address.ghnWardCode),
        districtId: address.ghnDistrictId,
      },
      parcel: {
        weightGram: order.shippingWeightGram ?? parcel.weightGram,
        lengthCm: parcel.lengthCm, widthCm: parcel.widthCm, heightCm: parcel.heightCm,
      },
      items: items.map((i) => ({
        name: i.variant?.name ?? `SP #${i.variantId}`,
        code: i.variant ? String(i.variant.id) : null,
        quantity: i.quantity,
        priceVnd: Number(i.priceAtPurchase),
        weightGram: i.variant?.weightGram ?? 500,
      })),
      serviceId: order.ghnServiceId ?? null,
      serviceTypeId: order.ghnServiceTypeId ?? undefined,
      note: order.notes ?? null,
    });

    // GHN dùng CHÍNH order_code làm mã tra cứu -> vừa là id vận đơn vừa là tracking.
    // Vận đơn preview được ghi nhãn KHÁC: carrier khác nên giao diện tự động
    // ẩn link tra cứu GHN (link đó sẽ 404 với mã giả), và admin nhìn là biết
    // đây chưa phải vận đơn thật.
    const carrierLabel = created.isPreview ? 'GHN (preview)' : 'GHN';
    const providerLabel = created.isPreview ? 'ghn-preview' : 'ghn';
    const shipmentStatus = created.isPreview ? 'preview' : 'label_created';

    const shipment = existing
      ? await existing.update({
          provider: providerLabel, carrier: carrierLabel,
          providerShipmentId: created.providerOrderCode,
          trackingNumber: created.providerOrderCode,
          cost: created.totalFee, currency: 'vnd',
          estimatedDeliveryAt: created.expectedDeliveryTime,
          rawResponse: created.raw, status: shipmentStatus,
        })
      : await OrderShipment.create({
          orderId,
          provider: providerLabel, carrier: carrierLabel,
          providerShipmentId: created.providerOrderCode,
          trackingNumber: created.providerOrderCode,
          cost: created.totalFee, currency: 'vnd',
          estimatedDeliveryAt: created.expectedDeliveryTime,
          rawResponse: created.raw, status: shipmentStatus,
        });

    // M-18: email thứ hai — báo mã vận đơn.
    // Email xác nhận lúc thanh toán KHÔNG thể chứa mã này vì vận đơn chỉ được
    // tạo ở bước xác nhận đơn. Với khách vãng lai đây là cách duy nhất để họ
    // nhận được mã tra cứu: họ không có tài khoản để xem lịch sử đơn.
    // Đưa vào hàng đợi thay vì gửi trực tiếp — SMTP hỏng không được phép làm
    // hỏng việc tạo vận đơn đã thành công bên GHN.
    await queueShipmentEmail(orderId);

    if (order.userId) {
      await this.notifications.notifyUser(order.userId, {
        type: 'order_status',
        title: `Đơn ${order.orderCode} đã có mã vận đơn`,
        body: `GHN: ${created.providerOrderCode}`,
        link: `/orders/${orderId}`,
      });
    }

    return shipment.toJSON() as IOrderShipment;
  }

  /** Create a shipment/label through the active shipping provider (mock or Easyship). */
  async createViaProvider(orderId: number): Promise<IOrderShipment> {
    const order = await Order.findByPk(orderId);
    if (!order) throw httpError(404, 'Order not found');
    if (!SHIPPABLE_STATUSES.includes(order.status)) {
      throw httpError(400, `Cannot create a shipment for an order with status "${order.status}"`);
    }
    const existing = await OrderShipment.findOne({ where: { orderId } });
    if (existing) throw httpError(409, 'This order already has a shipment');

    const provider = getShippingProvider();
    const created = await provider.createShipment({ id: order.id });

    const shipment = await OrderShipment.create({
      orderId,
      provider: created.provider,
      providerShipmentId: created.providerShipmentId,
      carrier: created.carrier,
      trackingNumber: created.trackingNumber,
      labelUrl: created.labelUrl,
      cost: created.cost,
      currency: created.currency,
      incoterm: created.incoterm,
      status: 'label_created',
    });
    return shipment.toJSON() as IOrderShipment;
  }

  /** Simulate a carrier tracking event (mock provider / non-production only). */
  async simulate(orderId: number, rawStatus: string): Promise<IOrderShipment> {
    const provider = getShippingProvider();
    if (!provider.isMock && config.server.env === 'production') {
      throw httpError(403, 'Tracking simulation is only available with the mock provider / non-production.');
    }
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'Shipment not found');
    if (!shipment.providerShipmentId) throw httpError(400, 'Shipment has no provider id to simulate against');
    await new ShipmentTrackingService().applyTrackingUpdate({
      providerShipmentId: shipment.providerShipmentId,
      rawStatus,
      event: `simulated:${rawStatus}`,
    });
    const fresh = await OrderShipment.findOne({ where: { orderId } });
    return fresh!.toJSON() as IOrderShipment;
  }

  /**
   * M-24: áp một sự kiện trạng thái từ webhook GHN.
   *
   * Tìm vận đơn theo mã GHN (chính là tracking_number). Cập nhật trạng thái vận
   * đơn + sự kiện gần nhất, và đẩy trạng thái ĐƠN theo hướng tiến. Forward-only:
   * webhook đến trễ/không đúng thứ tự không được kéo lùi đơn đã delivered.
   *
   * Trả về true nếu tìm thấy và xử lý; false nếu không có vận đơn khớp (webhook
   * vẫn phải trả 200 cho GHN để ngừng retry).
   */
  async applyGhnWebhook(input: {
    ghnOrderCode: string;
    status: string;
    description?: string | null;
    time?: string | null;
  }): Promise<boolean> {
    const shipment = await OrderShipment.findOne({ where: { trackingNumber: input.ghnOrderCode } });
    if (!shipment) return false;

    const shipmentStatus = mapGhnShipmentStatus(input.status);
    await shipment.update({
      status: shipmentStatus,
      lastEvent: input.description ?? input.status,
      lastEventAt: input.time ? new Date(input.time) : new Date(),
      ...(shipmentStatus === 'delivered' ? { deliveredAt: new Date(input.time ?? Date.now()) } : {}),
    });

    const targetOrderStatus = orderStatusFromGhn(input.status);
    if (!targetOrderStatus) return true;

    const order = await Order.findByPk(shipment.orderId);
    if (!order) return true;

    // Chỉ đẩy tới khi hợp lệ và TIẾN (statusTransitionError chặn lùi + trạng
    // thái cuối). Đơn đã delivered thì webhook "delivering" trễ không kéo lại.
    if (order.status === targetOrderStatus) return true;
    if (statusTransitionError(order.status, targetOrderStatus)) return true;

    const previous = order.status;
    await order.update({
      status: targetOrderStatus,
      ...(targetOrderStatus === 'delivered' ? { deliveredAt: new Date(input.time ?? Date.now()) } : {}),
    });

    if (previous !== targetOrderStatus) {
      await queueOrderStatusEmail({ orderId: order.id, status: targetOrderStatus });
      if (order.userId) await this.notifications.notifyUser(order.userId, {
        type: 'order_status',
        title: `Đơn ${order.orderCode} cập nhật: ${targetOrderStatus}`,
        link: `/orders/${order.id}`,
      });
    }
    return true;
  }

  /**
   * M-26: chủ động kéo trạng thái mới nhất từ GHN (Order Info) rồi áp vào đơn.
   *
   * Dùng khi webhook không tới được (server ngủ, chưa đăng ký URL). Là thao tác
   * CHỈ ĐỌC bên GHN — không tốn cước. Áp bằng đúng luật webhook (forward-only).
   */
  async syncFromGhn(orderId: number): Promise<{ synced: boolean; ghnStatus: string | null }> {
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment?.trackingNumber) throw httpError(400, 'Đơn chưa có mã vận đơn GHN để đồng bộ.');
    if (shipment.provider !== 'ghn') throw httpError(400, 'Đơn này không giao qua GHN.');

    const info = await new GhnService().getOrderStatus(shipment.trackingNumber);
    if (!info) return { synced: false, ghnStatus: null };

    await this.applyGhnWebhook({
      ghnOrderCode: shipment.trackingNumber,
      status: info.status,
      description: `Đồng bộ thủ công từ GHN: ${info.status}`,
    });
    return { synced: true, ghnStatus: info.status };
  }

  async remove(orderId: number): Promise<void> {
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'Shipment not found');
    await shipment.destroy();
  }
}
