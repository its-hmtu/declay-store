import config from '@/config/env';
import { logger } from '@/lib/logger';
import { buildRefundRequest, type VnpayRefundInput } from './vnpay.refund';

export interface VnpayRefundResult {
  success: boolean;
  responseCode: string | null;
  message: string | null;
  raw: unknown;
}

/**
 * M-29b: gọi API hoàn tiền VNPay THẬT.
 *
 * ⚠️ VNPay khoá refund ở sandbox (phải xin bật). Hàm này chỉ được gọi khi
 * RefundService thấy `config.vnpay.refundEnabled` = true; ngược lại service ghi
 * nhận yêu cầu hoàn ở trạng thái 'pending' để admin xử lý tay, KHÔNG gọi tới đây.
 */
export async function callVnpayRefund(input: VnpayRefundInput): Promise<VnpayRefundResult> {
  const { tmnCode, hashSecret, refundApiUrl } = config.vnpay;
  const body = buildRefundRequest(input, { tmnCode, secret: hashSecret });

  const res = await fetch(refundApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  const responseCode = (raw?.vnp_ResponseCode as string) ?? null;
  const result: VnpayRefundResult = {
    success: responseCode === '00',
    responseCode,
    message: (raw?.vnp_Message as string) ?? null,
    raw,
  };
  logger.info('VNPay refund API response', {
    requestId: input.requestId, txnRef: input.txnRef, responseCode, success: result.success,
  });
  return result;
}
