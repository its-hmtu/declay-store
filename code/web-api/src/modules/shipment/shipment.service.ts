import { Order, OrderShipment } from '@/modules/order/order.entity';
import NotificationService from '@/modules/notification/notification.service';
import { queueOrderStatusEmail } from '@/lib/email-queue';
import { statusTransitionError } from '@/modules/order/order.pricing';
import {
  mapProviderStatus, orderStatusForShipment, isShipmentTerminal, type ShipmentStatus,
} from './shipment.status';

export interface TrackingUpdate {
  providerShipmentId: string;
  rawStatus: string;
  event?: string;
  at?: Date;
  podUrl?: string | null;
}

export interface TrackingResult {
  applied: boolean;
  reason?: string;
  shipmentStatus?: ShipmentStatus;
  orderStatus?: string | null;
}

export default class ShipmentService {
  private notificationService = new NotificationService();

  /**
   * Idempotently apply a carrier/aggregator tracking update to a shipment and,
   * when appropriate, advance the order status. Safe to call repeatedly with the
   * same or out-of-order events (dedup by terminal state + event timestamp).
   */
  async applyTrackingUpdate(u: TrackingUpdate): Promise<TrackingResult> {
    const shipment = await OrderShipment.findOne({ where: { providerShipmentId: u.providerShipmentId } });
    if (!shipment) return { applied: false, reason: 'shipment_not_found' };

    if (isShipmentTerminal(shipment.status as ShipmentStatus)) {
      return { applied: false, reason: 'already_terminal' };
    }

    const at = u.at ?? new Date();
    if (shipment.lastEventAt && at.getTime() < new Date(shipment.lastEventAt).getTime()) {
      return { applied: false, reason: 'stale_event' };
    }

    const next = mapProviderStatus(u.rawStatus);
    await shipment.update({
      status: next,
      lastEvent: u.event ?? u.rawStatus,
      lastEventAt: at,
      podUrl: u.podUrl ?? shipment.podUrl,
      deliveredAt: next === 'delivered' ? at : shipment.deliveredAt,
    });

    const target = orderStatusForShipment(next);
    let orderStatus: string | null = null;
    if (target) {
      const order = await Order.findByPk(shipment.orderId);
      if (order && !statusTransitionError(order.status, target)) {
        // M-06: record delivery time so the return window can be evaluated.
        await order.update({ status: target, ...(target === 'delivered' ? { deliveredAt: at } : {}) });
        orderStatus = target;
        await queueOrderStatusEmail({ orderId: order.id, status: target });
        if (order.userId) await this.notificationService.notifyUser(order.userId, {
          type: 'order_status',
          title: `Order #${order.id} is now ${target}`,
          link: `/orders/${order.id}`,
        });
      }
    }

    return { applied: true, shipmentStatus: next, orderStatus };
  }
}
