import { Op } from 'sequelize';
import { Payment } from './payment.entity';
import { Order } from '@/modules/order/order.entity';
import { httpError } from '@/utils/http-error';
import { reconcileCod, canReconcile, round2, type ReconcileResult } from './cod.reconcile';

export interface CodPendingRow {
  paymentId: number;
  orderId: number;
  amount: number;
  status: string;
  deliveredAt: string | null;
  customer: string;
}

export default class CodService {
  /** M-07: delivered COD orders whose cash has not been checked off yet (BR-11). */
  async listPending(): Promise<CodPendingRow[]> {
    const rows = await Payment.findAll({
      where: { method: 'cod', reconciledAt: { [Op.is]: null } },
      include: [{
        model: Order,
        as: 'order',
        required: true,
        where: { status: { [Op.in]: ['delivered', 'returned'] } },
      }],
      order: [['createdAt', 'ASC']],
    });

    return rows.map((p) => {
      const order = (p as unknown as { order: Order }).order;
      return {
        paymentId: p.id,
        orderId: p.orderId,
        amount: Number(p.amount),
        status: order.status,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
        customer: order.guestName ?? (order.userId ? `User #${order.userId}` : 'Guest'),
      };
    });
  }

  /** Record the cash actually handed over; any difference is stored, never hidden. */
  async reconcile(
    paymentId: number,
    collectedAmount: number,
    adminId: number,
    note?: string,
  ): Promise<{ payment: Payment; result: ReconcileResult }> {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw httpError(404, 'Payment not found');
    if (payment.method !== 'cod') throw httpError(400, 'Only COD payments need reconciliation');

    const order = await Order.findByPk(payment.orderId);
    if (!order) throw httpError(404, 'Order not found');

    const blocked = canReconcile(order.status, payment.reconciledAt != null);
    if (blocked) throw httpError(400, blocked);

    const result = reconcileCod(Number(payment.amount), collectedAmount);

    await payment.update({
      reconciledAt: new Date(),
      reconciledAmount: round2(collectedAmount),
      reconciledBy: adminId,
      reconcileNote: note ?? null,
      // Only a matching amount settles the payment; a mismatch stays open for follow-up.
      status: result.outcome === 'matched' ? 'succeeded' : payment.status,
    });

    return { payment, result };
  }
}
