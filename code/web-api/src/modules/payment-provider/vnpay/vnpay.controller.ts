import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import config from '@/config/env';
import { logger } from '@/lib/logger';
import { Payment } from '@/modules/payment/payment.entity';
import OrderService from '@/modules/order/order.service';
import { verifySignature } from './vnpay.signature';
import { orderIdFromTxnRef } from './vnpay.provider';
import { decideSettlement, normalizeTransactionStatus, type SettlementDecision } from './vnpay.settlement';

const orderService = new OrderService();

interface SettleOutcome extends SettlementDecision {
  orderId: number | null;
  /** M-16: mã hiển thị cho khách — giao diện không dùng id. */
  orderCode: string | null;
  orderStatus: string | null;
}

/**
 * Thực thi quyết định ghi nhận thanh toán. Dùng chung cho IPN và trang return
 * để hai lối vào không bao giờ lệch luật. Idempotent: lối nào tới trước cũng được.
 *
 * @param source chỉ để ghi log — biết đơn được ghi nhận nhờ IPN hay nhờ khách quay lại.
 */
async function settleFromParams(
  params: Record<string, string>,
  source: 'ipn' | 'return',
): Promise<SettleOutcome> {
  const signatureValid = verifySignature(params, config.vnpay.hashSecret, params.vnp_SecureHash);
  const orderId = orderIdFromTxnRef(params.vnp_TxnRef ?? '');

  const order = orderId ? await orderService.findByIdRaw(orderId) : null;
  const payment = orderId
    ? await Payment.findOne({ where: { orderId }, order: [['id', 'DESC']] })
    : null;

  const decision = decideSettlement({
    signatureValid,
    orderId,
    orderExists: Boolean(order),
    orderStatus: order?.status ?? null,
    snapshotAmountVnd: payment?.chargedAmount == null ? null : Number(payment.chargedAmount),
    receivedVnpAmount: Number(params.vnp_Amount),
    responseCode: params.vnp_ResponseCode ?? null,
    transactionStatus: normalizeTransactionStatus(
      params.vnp_ResponseCode ?? null,
      params.vnp_TransactionStatus ?? null,
    ),
  });

  // Log đủ để chẩn đoán ngay trên dashboard: vì sao một đơn KHÔNG được ghi nhận
  // luôn nhìn thấy được ở đây, không cần bật debug hay dựng lại hiện trường.
  logger.info('VNPay settlement decision', {
    source,
    orderId,
    txnRef: params.vnp_TxnRef,
    rspCode: decision.rspCode,
    action: decision.action,
    orderStatusBefore: order?.status ?? null,
    responseCode: params.vnp_ResponseCode ?? null,
    receivedAmount: params.vnp_Amount ?? null,
    snapshotAmount: payment?.chargedAmount ?? null,
  });

  if (decision.action === 'settle' && orderId) {
    await Payment.update(
      { providerRef: params.vnp_TransactionNo ?? params.vnp_TxnRef, status: 'succeeded' },
      { where: { orderId } },
    );
    await orderService.markVnpayPaid(orderId);
    logger.info('VNPay payment confirmed', { source, orderId, txnNo: params.vnp_TransactionNo });
  } else if (decision.action === 'mark_failed' && orderId) {
    await Payment.update({ status: 'failed' }, { where: { orderId } });
    logger.warn('VNPay payment failed', { source, orderId, code: params.vnp_ResponseCode });
  }

  const finalOrder = orderId ? await orderService.findByIdRaw(orderId) : null;
  return {
    ...decision,
    orderId,
    orderCode: finalOrder?.orderCode ?? null,
    orderStatus: finalOrder?.status ?? null,
  };
}

/**
 * VNPay IPN (M-12) — lối ghi nhận CHÍNH, gọi server-to-server nên không phụ thuộc
 * việc khách có quay lại trình duyệt hay không. VNPay retry đến khi nhận được
 * RspCode "00", vì vậy handler phải idempotent và luôn trả đúng envelope của họ.
 */
export const vnpayIpn = asyncHandler(async (req: Request, res: Response) => {
  // VNPay gửi GET query; một số cấu hình gửi POST form — chấp nhận cả hai.
  const body = (req.body ?? {}) as Record<string, string>;
  const params = { ...(req.query as Record<string, string>), ...body };
  const outcome = await settleFromParams(params, 'ipn');
  res.json({ RspCode: outcome.rspCode, Message: outcome.message });
});

/**
 * Trang return của khách. KHÔNG chỉ để hiển thị: nó cũng chạy đúng luật ghi nhận,
 * làm lưới an toàn cho trường hợp IPN chưa/không tới được máy chủ (chưa khai báo
 * IPN URL trên cổng, môi trường localhost, dịch vụ đang ngủ). An toàn vì chữ ký
 * HMAC-SHA512 được kiểm lại phía server — khách không thể tự tạo kết quả "thành công".
 */
export const vnpayVerifyReturn = asyncHandler(async (req: Request, res: Response) => {
  const params = { ...req.query } as Record<string, string>;
  const outcome = await settleFromParams(params, 'return');
  const valid = outcome.rspCode !== '97';
  const paid = valid && outcome.orderStatus != null && outcome.orderStatus !== 'pending_payment';

  // M-17: trả kèm nội dung đơn để trang cảm ơn hiển thị đầy đủ.
  // Khách vãng lai không xem được /orders/:id, nên nếu ở đây không hiện thì họ
  // không còn chỗ nào khác để xem mình vừa mua gì.
  // Chỉ trả khi chữ ký hợp lệ VÀ đơn đã thanh toán — không để URL đoán mò moi
  // được nội dung đơn của người khác.
  const summary = paid && outcome.orderId
    ? await orderService.getPublicSummary(outcome.orderId)
    : null;

  res.json({
    success: true,
    data: {
      valid,
      orderId: outcome.orderId,
      orderCode: outcome.orderCode,
      // "đã trả tiền" = đơn thực sự đã rời khỏi pending_payment TRONG DB,
      // không phải chỉ vì URL trên trình duyệt nói vậy.
      paid,
      orderStatus: outcome.orderStatus,
      responseCode: params.vnp_ResponseCode ?? null,
      summary,
    },
    message: outcome.message,
  });
});
