/**
 * M-12 FX — quy đổi tiền tệ cho VNPay.
 *
 * VNPay CHỈ nhận VND. Cửa hàng đang niêm yết USD, nên mọi đơn thanh toán qua
 * VNPay phải được quy đổi trước khi ký. Module này là hàm thuần để test được
 * và để chỉ tồn tại **một** nơi duy nhất định nghĩa quy tắc quy đổi.
 *
 * Bài học từ lỗi thực tế: tỉ giá mặc định bằng 1 khiến đơn $350 bị gửi sang
 * VNPay thành 350đ. Vì vậy tỉ giá KHÔNG có giá trị mặc định an toàn —
 * `assertUsableRate` bắt hệ thống dừng lại thay vì âm thầm thu sai tiền.
 */

/** Tỉ giá thấp hơn ngưỡng này chắc chắn là cấu hình sai (USD/VND luôn > 20.000). */
export const MIN_PLAUSIBLE_USD_VND_RATE = 1000;

/** VNPay/ngân hàng VN không xử lý số lẻ nhỏ hơn 1.000đ — làm tròn LÊN bội số 1.000. */
export const VND_ROUNDING_UNIT = 1000;

/** VNPay từ chối giao dịch dưới 5.000đ. */
export const VNPAY_MIN_AMOUNT_VND = 5000;

export class FxConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxConfigurationError';
  }
}

/**
 * Chặn đơn hàng ngay từ đầu nếu tỉ giá chưa được cấu hình đúng.
 * Thà không cho đặt hàng còn hơn thu của khách sai số tiền.
 */
export function assertUsableRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < MIN_PLAUSIBLE_USD_VND_RATE) {
    throw new FxConfigurationError(
      `VNPAY_USD_TO_VND chưa được cấu hình đúng (đang là "${rate}"). ` +
        `Tỉ giá USD→VND phải >= ${MIN_PLAUSIBLE_USD_VND_RATE}.`,
    );
  }
  return rate;
}

/**
 * Quy đổi USD sang VND, làm tròn LÊN bội số 1.000đ.
 * Làm tròn lên (không phải gần nhất) để cửa hàng không bao giờ thu thiếu.
 */
export function convertUsdToVnd(amountUsd: number | string, rate: number): number {
  assertUsableRate(rate);
  const usd = Number(amountUsd);
  if (!Number.isFinite(usd) || usd < 0) {
    throw new FxConfigurationError(`Số tiền không hợp lệ: "${amountUsd}"`);
  }
  const raw = usd * rate;
  return Math.ceil(raw / VND_ROUNDING_UNIT) * VND_ROUNDING_UNIT;
}

/** VNPay yêu cầu số tiền nhân 100, không phần thập phân. */
export function toVnpAmount(amountVnd: number | string): number {
  const vnd = Math.round(Number(amountVnd));
  return vnd * 100;
}

/** VNPay từ chối giao dịch quá nhỏ — báo lỗi sớm thay vì để cổng trả lỗi khó hiểu. */
export function assertPayableVnd(amountVnd: number): number {
  if (amountVnd < VNPAY_MIN_AMOUNT_VND) {
    throw new FxConfigurationError(
      `Số tiền ${amountVnd}đ nhỏ hơn mức tối thiểu ${VNPAY_MIN_AMOUNT_VND}đ của VNPay.`,
    );
  }
  return amountVnd;
}

/** Hiển thị cho khách: "1.234.000 ₫". */
export function formatVnd(amountVnd: number): string {
  return `${Math.round(amountVnd).toLocaleString('vi-VN')} ₫`;
}
