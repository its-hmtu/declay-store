import Stripe from 'stripe';
import config from '@/config/env';
import { logger } from '@/lib/logger';
import { httpError } from '@/utils/http-error';
import { Order } from '@/modules/order/order.entity';
import { Payment, Refund, type RefundMethod, type RefundType } from '@/modules/payment/payment.entity';
import { vnpDate, sanitizeOrderInfo } from '@/modules/payment-provider/vnpay/vnpay.signature';
import { callVnpayRefund } from '@/modules/payment-provider/vnpay/vnpay.refund.caller';
import { VNP_REFUND_FULL, VNP_REFUND_PARTIAL } from '@/modules/payment-provider/vnpay/vnpay.refund';

const stripe = new Stripe(config.stripe.secretKey);

export interface IssueRefundInput {
  order: Order;
  /** Số tiền hoàn (VND). */
  amountVnd: number;
  reason: string;
  type: RefundType;                       // 'cancel' | 'return'
  cancellationRequestId?: number | null;
  returnRequestId?: number | null;
  /** Admin thực hiện (dành cho audit + vnp_CreateBy). */
  initiatedBy?: number | null;
  createBy?: string;
}

/**
 * M-29b: hoàn tiền đa kênh, idempotent.
 *
 * Chọn kênh theo phương thức thanh toán gốc của đơn:
 *   - Stripe  -> gọi Stripe refund API (đồng bộ).
 *   - VNPay   -> gọi API refund NẾU bật (config); nếu tắt/thiếu dữ liệu -> ghi
 *                nhận 'pending' cho admin xử lý tay.
 *   - CK/COD  -> luôn 'pending': admin chuyển khoản tay rồi đánh dấu đã hoàn.
 *
 * Idempotent (BR-F3): đã có Refund cho cùng yêu cầu (huỷ/trả) ở trạng thái
 * succeeded/pending thì trả về bản ghi đó thay vì tạo thêm.
 */
export default class RefundService {
  async issueRefund(input: IssueRefundInput): Promise<Refund> {
    const { order, amountVnd, reason, type } = input;
    if (amountVnd <= 0) throw httpError(400, 'Số tiền hoàn phải lớn hơn 0.');

    // 1) Idempotency: khoá theo yêu cầu; nếu là huỷ tức thì (không có request id)
    //    thì khoá theo (order, type).
    const existing = await this.findExistingRefund(input);
    if (existing) {
      logger.info('Refund idempotent hit — trả bản ghi cũ', { orderId: order.id, refundId: existing.id });
      return existing;
    }

    // 2) Xác định kênh từ Payment gốc.
    const payment = await Payment.findOne({ where: { orderId: order.id }, order: [['id', 'DESC']] });
    const method = this.resolveMethod(order, payment);

    const base = {
      orderId: order.id,
      paymentId: payment?.id ?? null,
      amount: amountVnd,
      currency: 'vnd',
      reason,
      type,
      cancellationRequestId: input.cancellationRequestId ?? null,
      returnRequestId: input.returnRequestId ?? null,
      initiatedBy: input.initiatedBy ?? null,
    };

    if (method === 'stripe') return this.refundStripe(order, base);
    if (method === 'vnpay') return this.refundVnpay(order, payment, base, input);
    // bank_transfer / cod: luôn chờ admin chuyển khoản tay.
    return this.recordManual(base, 'bank_transfer');
  }

  /** Admin đánh dấu một khoản hoàn tay đã chuyển khoản xong. */
  async markManualSettled(refundId: number, providerRef?: string | null): Promise<Refund> {
    const refund = await Refund.findByPk(refundId);
    if (!refund) throw httpError(404, 'Không tìm thấy khoản hoàn.');
    if (refund.status === 'succeeded') return refund;
    await refund.update({ status: 'succeeded', providerRef: providerRef ?? refund.providerRef });
    return refund;
  }

  /* ── nội bộ ───────────────────────────────────────────── */

  private async findExistingRefund(input: IssueRefundInput): Promise<Refund | null> {
    const where: Record<string, unknown> = { status: ['succeeded', 'pending'] };
    if (input.cancellationRequestId) where.cancellationRequestId = input.cancellationRequestId;
    else if (input.returnRequestId) where.returnRequestId = input.returnRequestId;
    else { where.orderId = input.order.id; where.type = input.type; }
    return Refund.findOne({ where });
  }

  private resolveMethod(order: Order, payment: Payment | null): RefundMethod {
    if (order.stripePaymentIntentId || payment?.method === 'stripe') return 'stripe';
    if (payment?.method === 'vnpay') return 'vnpay';
    return 'bank_transfer'; // cod / bank_transfer -> hoàn tay
  }

  private async refundStripe(order: Order, base: Record<string, unknown>): Promise<Refund> {
    const pi = order.stripePaymentIntentId;
    if (!pi) return this.recordManual(base, 'bank_transfer');
    const refund = await stripe.refunds.create({ payment_intent: pi, amount: Math.round(Number(base.amount) * 100) });
    return Refund.create({
      ...base, method: 'stripe', provider: 'stripe',
      providerRef: refund.id, stripeRefundId: refund.id, status: 'succeeded',
    } as never);
  }

  private async refundVnpay(
    order: Order,
    payment: Payment | null,
    base: Record<string, unknown>,
    input: IssueRefundInput,
  ): Promise<Refund> {
    // Thiếu dữ liệu gốc hoặc chưa bật API -> ghi nhận pending cho admin.
    const ready = config.vnpay.refundEnabled && payment?.providerTxnRef && payment?.providerPayDate;
    if (!ready) {
      const why = config.vnpay.refundEnabled ? 'thiếu dữ liệu giao dịch gốc' : 'API refund VNPay chưa bật';
      logger.warn(`VNPay refund -> pending (${why})`, { orderId: order.id });
      return this.recordManual({ ...base, reason: `${base.reason} [VNPay: ${why}]` }, 'vnpay');
    }

    const isFull = Number(base.amount) >= Number(order.totalAmount);
    const result = await callVnpayRefund({
      requestId: `RF${order.id}-${Date.now()}`,
      transactionType: isFull ? VNP_REFUND_FULL : VNP_REFUND_PARTIAL,
      txnRef: payment!.providerTxnRef!,
      amountVnd: Number(base.amount),
      transactionNo: payment!.providerRef ?? '',
      transactionDate: payment!.providerPayDate!,
      createBy: input.createBy ?? 'system',
      createDate: vnpDate(new Date()),
      ipAddr: '127.0.0.1',
      orderInfo: sanitizeOrderInfo(String(base.reason)),
    });

    return Refund.create({
      ...base,
      method: 'vnpay', provider: 'vnpay',
      providerRef: result.responseCode,
      // Thất bại -> pending để admin can thiệp, không đánh dấu succeeded nhầm.
      status: result.success ? 'succeeded' : 'pending',
    } as never);
  }

  private async recordManual(base: Record<string, unknown>, method: RefundMethod): Promise<Refund> {
    return Refund.create({ ...base, method, provider: method, status: 'pending' } as never);
  }
}
