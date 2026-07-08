import { sequelize } from '@/config/sequelize';
import { Order, OrderShipment } from '@/modules/order/order.entity';
import { httpError } from '@/utils/http-error';
import { queueOrderStatusEmail } from '@/lib/email-queue';
import NotificationService from '@/modules/notification/notification.service';
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

    await this.notifications.notifyUser(order.userId, {
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
        await Order.update({ status: 'delivered' }, { where: { id: orderId }, transaction: t });
      }

      return shipment;
    });

    if (markingDelivered) {
      await queueOrderStatusEmail({ orderId, status: 'delivered' });
      const deliveredOrder = await Order.findByPk(orderId);
      if (deliveredOrder) {
        await this.notifications.notifyUser(deliveredOrder.userId, {
          type: 'order_status', title: `Order #${orderId} has been delivered`, link: `/orders/${orderId}`,
        });
      }
    }

    return updated.toJSON() as IOrderShipment;
  }

  async remove(orderId: number): Promise<void> {
    const shipment = await OrderShipment.findOne({ where: { orderId } });
    if (!shipment) throw httpError(404, 'Shipment not found');
    await shipment.destroy();
  }
}
