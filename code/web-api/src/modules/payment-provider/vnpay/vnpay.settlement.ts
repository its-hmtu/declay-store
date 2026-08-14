/**
 * M-12: LUẬT ghi nhận thanh toán VNPay — tách riêng, thuần, test được.
 *
 * Bối cảnh sự cố: ban đầu chỉ IPN mới ghi nhận thanh toán. IPN là lời gọi
 * server-to-server từ VNPay; nếu nó không tới được (chưa khai báo IPN URL,
 * server chạy localhost, hoặc dịch vụ đang ngủ trên gói Free) thì khách đã trả
 * tiền mà đơn vẫn treo `pending_payment`.
 *
 * Vì vậy CẢ HAI lối vào — IPN và trang return của khách — đều chạy đúng luật
 * này. An toàn vì chữ ký HMAC-SHA512 chỉ ký được bằng secret của merchant:
 * khách không thể tự bịa một kết quả "thành công" hợp lệ. Ghi nhận là
 * idempotent nên lối nào tới trước cũng cho cùng một kết quả.
 */

export type SettlementAction = 'settle' | 'mark_failed' | 'none';

export interface SettlementInput {
  signatureValid: boolean;
  /** id đơn đọc từ vnp_TxnRef; null nếu không parse được */
  orderId: number | null;
  orderExists: boolean;
  /** trạng thái đơn hiện tại trong DB */
  orderStatus: string | null;
  /** payments.charged_amount đã chốt lúc tạo đơn (VND); null nếu thiếu */
  snapshotAmountVnd: number | null;
  /** vnp_Amount VNPay gửi sang (đã nhân 100) */
  receivedVnpAmount: number;
  responseCode: string | null;
  transactionStatus: string | null;
}

export interface SettlementDecision {
  /** Mã trả về theo chuẩn VNPay IPN */
  rspCode: '00' | '01' | '02' | '04' | '97';
  message: string;
  action: SettlementAction;
}

/** VNPay yêu cầu số tiền nhân 100. */
function expectedVnpAmount(snapshotVnd: number): number {
  return Math.round(snapshotVnd) * 100;
}

export function decideSettlement(input: SettlementInput): SettlementDecision {
  // 1. Chữ ký sai = dữ liệu không đến từ VNPay. Không làm gì cả.
  if (!input.signatureValid) {
    return { rspCode: '97', message: 'Invalid signature', action: 'none' };
  }

  // 2. Không tìm được đơn.
  if (!input.orderId || !input.orderExists) {
    return { rspCode: '01', message: 'Order not found', action: 'none' };
  }

  // 3. Thiếu bản chốt số tiền -> không có gì để đối chiếu, tuyệt đối không đoán.
  if (input.snapshotAmountVnd == null) {
    return { rspCode: '01', message: 'Missing charged amount snapshot', action: 'none' };
  }

  // 4. Đối chiếu số tiền với BẢN CHỐT, không tính lại theo tỉ giá hiện hành.
  if (input.receivedVnpAmount !== expectedVnpAmount(input.snapshotAmountVnd)) {
    return { rspCode: '04', message: 'Invalid amount', action: 'none' };
  }

  // 5. Đơn đã được xử lý rồi -> idempotent, không lặp side-effect.
  //    VNPay retry IPN nhiều lần, và khách có thể F5 trang return.
  if (input.orderStatus !== 'pending_payment') {
    return { rspCode: '02', message: 'Order already confirmed', action: 'none' };
  }

  // 6. Thành công chỉ khi CẢ HAI mã đều '00' (theo tài liệu VNPay 2.1.0).
  if (input.responseCode === '00' && input.transactionStatus === '00') {
    return { rspCode: '00', message: 'Confirm Success', action: 'settle' };
  }

  // 7. Giao dịch thất bại/huỷ: vẫn trả '00' để VNPay ngừng retry, nhưng đánh dấu hỏng.
  return { rspCode: '00', message: 'Payment failed recorded', action: 'mark_failed' };
}

/**
 * Trang return của khách không có `vnp_TransactionStatus` trong mọi trường hợp.
 * Khi thiếu, suy ra từ `vnp_ResponseCode` để hai lối vào cùng một luật.
 */
export function normalizeTransactionStatus(
  responseCode: string | null,
  transactionStatus: string | null,
): string | null {
  if (transactionStatus != null && transactionStatus !== '') return transactionStatus;
  return responseCode;
}
