import { createHmac } from 'node:crypto';
import { toVnpAmount } from './vnpay.fx';

/**
 * M-29b: dựng và ký yêu cầu HOÀN TIỀN VNPay (API refund, spec v2.1.0). Thuần,
 * không I/O — đây là lõi bảo mật, tách riêng để test.
 *
 * ⚠️ Chữ ký refund KHÁC lúc thanh toán: KHÔNG sort theo key rồi key=value, mà nối
 * các trường theo ĐÚNG THỨ TỰ dưới đây bằng dấu '|'. Sai thứ tự là sai chữ ký.
 *   vnp_RequestId | vnp_Version | vnp_Command | vnp_TmnCode | vnp_TransactionType
 *   | vnp_TxnRef | vnp_Amount | vnp_TransactionNo | vnp_TransactionDate
 *   | vnp_CreateBy | vnp_CreateDate | vnp_IpAddr | vnp_OrderInfo
 */

export const VNP_REFUND_FULL = '02';
export const VNP_REFUND_PARTIAL = '03';
export type VnpRefundType = typeof VNP_REFUND_FULL | typeof VNP_REFUND_PARTIAL;

export interface VnpayRefundInput {
  /** Duy nhất mỗi yêu cầu hoàn, không lặp trong ngày. */
  requestId: string;
  transactionType: VnpRefundType;
  /** vnp_TxnRef gốc của giao dịch thanh toán. */
  txnRef: string;
  /** Số tiền hoàn (VND, chưa ×100). */
  amountVnd: number;
  /** Mã giao dịch VNPay (vnp_TransactionNo); '' nếu không có (dùng TxnRef+Date). */
  transactionNo: string;
  /** vnp_PayDate của giao dịch gốc, yyyyMMddHHmmss GMT+7. */
  transactionDate: string;
  /** Người tạo yêu cầu (username admin). */
  createBy: string;
  /** Thời điểm tạo yêu cầu, yyyyMMddHHmmss GMT+7. */
  createDate: string;
  ipAddr: string;
  orderInfo: string;
  locale?: 'vn' | 'en';
}

/** Chuỗi ký refund — thứ tự CỐ ĐỊNH nối bằng '|'. */
export function buildRefundSignData(input: VnpayRefundInput, tmnCode: string): string {
  return [
    input.requestId,
    '2.1.0',
    'refund',
    tmnCode,
    input.transactionType,
    input.txnRef,
    String(toVnpAmount(input.amountVnd)),
    input.transactionNo ?? '',
    input.transactionDate,
    input.createBy,
    input.createDate,
    input.ipAddr,
    input.orderInfo,
  ].join('|');
}

export function signRefund(input: VnpayRefundInput, tmnCode: string, secret: string): string {
  return createHmac('sha512', secret).update(buildRefundSignData(input, tmnCode), 'utf-8').digest('hex');
}

/** Body JSON gửi cho API refund, đã gắn chữ ký. */
export function buildRefundRequest(
  input: VnpayRefundInput,
  cfg: { tmnCode: string; secret: string },
): Record<string, string | number> {
  return {
    vnp_RequestId: input.requestId,
    vnp_Version: '2.1.0',
    vnp_Command: 'refund',
    vnp_TmnCode: cfg.tmnCode,
    vnp_TransactionType: input.transactionType,
    vnp_TxnRef: input.txnRef,
    vnp_Amount: toVnpAmount(input.amountVnd),
    vnp_TransactionNo: input.transactionNo || '',
    vnp_TransactionDate: input.transactionDate,
    vnp_CreateBy: input.createBy,
    vnp_CreateDate: input.createDate,
    vnp_IpAddr: input.ipAddr,
    vnp_OrderInfo: input.orderInfo,
    vnp_Locale: input.locale ?? 'vn',
    vnp_SecureHash: signRefund(input, cfg.tmnCode, cfg.secret),
  };
}
