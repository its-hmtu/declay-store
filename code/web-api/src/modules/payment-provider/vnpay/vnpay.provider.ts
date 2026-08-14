import config from '@/config/env';
import {
  signParams, vnpDate, sanitizeOrderInfo, type VnpParams,
} from './vnpay.signature';
import { toVnpAmount, assertPayableVnd } from './vnpay.fx';

export interface VnpayPaymentInput {
  orderId: number;
  /**
   * Số tiền ĐÃ quy đổi sang VND và đã chốt trên payments.charged_amount.
   * Provider không tự quy đổi để tỉ giá chỉ được áp dụng đúng một lần, lúc tạo đơn.
   */
  amountVnd: number;
  ipAddr: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
}

/**
 * Build the redirect URL to VNPay's hosted payment page (M-12).
 * The signature covers every parameter, so the amount cannot be tampered with.
 */
export function buildVnpayPaymentUrl(input: VnpayPaymentInput): string {
  const { tmnCode, hashSecret, payUrl, returnUrl, expireMinutes } = config.vnpay;
  if (!tmnCode || !hashSecret) {
    throw new Error('VNPay is not configured (VNPAY_TMN_CODE / VNPAY_HASH_SECRET)');
  }

  const now = new Date();
  const expire = new Date(now.getTime() + expireMinutes * 60 * 1000);

  const params: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: toVnpAmount(assertPayableVnd(input.amountVnd)),
    vnp_CurrCode: 'VND',
    // Unique per attempt: VNPay rejects a duplicated TxnRef within the same day.
    vnp_TxnRef: `${input.orderId}-${now.getTime()}`,
    vnp_OrderInfo: sanitizeOrderInfo(`Thanh toan don hang ${input.orderId}`),
    vnp_OrderType: 'other',
    vnp_Locale: input.locale ?? 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: input.ipAddr,
    vnp_CreateDate: vnpDate(now),
    vnp_ExpireDate: vnpDate(expire),
    ...(input.bankCode ? { vnp_BankCode: input.bankCode } : {}),
  };

  const signed = signParams(params, hashSecret);
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&');

  return `${payUrl}?${query}&vnp_SecureHash=${signed}`;
}

/** `vnp_TxnRef` is "<orderId>-<timestamp>" — pull the order id back out. */
export function orderIdFromTxnRef(txnRef: string): number | null {
  const id = Number(String(txnRef).split('-')[0]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
