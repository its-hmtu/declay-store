/**
 * M-12/M-15 — quy tắc số tiền gửi cho VNPay.
 *
 * Từ M-15 cửa hàng niêm yết thẳng bằng VND (thị trường trong nước), nên KHÔNG
 * còn quy đổi tiền tệ nữa. Đây chính là điều làm biến mất cả nhóm lỗi "sai số
 * tiền": không có tỉ giá thì không có gì để cấu hình sai.
 *
 * Module vẫn giữ lại vì hai luật dưới đây là của VNPay, không phải của tỉ giá:
 * làm tròn về đồng chẵn và mức giao dịch tối thiểu.
 */

/** Giá niêm yết Việt Nam không dùng số lẻ dưới 1.000đ. */
export const VND_ROUNDING_UNIT = 1000;

/** VNPay từ chối giao dịch dưới 5.000đ. */
export const VNPAY_MIN_AMOUNT_VND = 5000;

export class FxConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxConfigurationError';
  }
}

/** Chuẩn hoá số tiền đơn hàng về đồng chẵn trước khi gửi cổng. */
export function normalizeVnd(amount: number | string): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    throw new FxConfigurationError(`Số tiền không hợp lệ: "${amount}"`);
  }
  return Math.round(value / VND_ROUNDING_UNIT) * VND_ROUNDING_UNIT;
}

/** VNPay yêu cầu số tiền nhân 100, không phần thập phân. */
export function toVnpAmount(amountVnd: number | string): number {
  return Math.round(Number(amountVnd)) * 100;
}

/** Báo lỗi sớm thay vì để cổng trả về mã lỗi khó hiểu. */
export function assertPayableVnd(amountVnd: number): number {
  if (amountVnd < VNPAY_MIN_AMOUNT_VND) {
    throw new FxConfigurationError(
      `Số tiền ${amountVnd}đ nhỏ hơn mức tối thiểu ${VNPAY_MIN_AMOUNT_VND}đ của VNPay.`,
    );
  }
  return amountVnd;
}

/** Hiển thị cho khách: "1.300.000 ₫". */
export function formatVnd(amountVnd: number): string {
  return `${Math.round(amountVnd).toLocaleString('vi-VN')} ₫`;
}
