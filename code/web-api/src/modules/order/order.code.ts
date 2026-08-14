/**
 * M-16: mã đơn hàng cho người dùng.
 *
 * Vì sao không dùng thẳng `orders.id`:
 *  1. Phơi id tuần tự cho biết cửa hàng có bao nhiêu đơn — đối thủ đếm được
 *     sản lượng chỉ bằng cách đặt hai đơn cách nhau vài ngày.
 *  2. Khách đọc "#42" qua điện thoại rất dễ nhầm với mã khác; mã có tiền tố và
 *     ngày thì tra cứu và đối soát nhanh hơn nhiều.
 *  3. Đổi cơ sở dữ liệu hoặc gộp hệ thống sau này thì id có thể đổi, mã thì không.
 *
 * Định dạng: DC-YYMMDD-XXXX
 *   DC     tiền tố cửa hàng (Declay)
 *   YYMMDD ngày đặt theo giờ Việt Nam
 *   XXXX   4 ký tự ngẫu nhiên, bỏ các ký tự dễ đọc nhầm
 */

export const ORDER_CODE_PREFIX = 'DC';

/**
 * Bảng chữ cái Crockford rút gọn: bỏ I, L, O, U, 0, 1.
 * I/1/L và O/0 nhìn giống nhau khi in trên nhãn hoặc đọc qua điện thoại; U bị
 * bỏ để không vô tình sinh ra từ thô tục.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export const ORDER_CODE_PATTERN = /^DC-\d{6}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/;

/** Ngày theo giờ Việt Nam — cửa hàng và khách đều ở múi giờ này. */
export function orderDatePart(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/**
 * @param random hàm sinh số [0,1) — tách ra để test tất định.
 */
export function generateOrderCode(date: Date = new Date(), random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `${ORDER_CODE_PREFIX}-${orderDatePart(date)}-${suffix}`;
}

export function isValidOrderCode(code: string): boolean {
  return ORDER_CODE_PATTERN.test(code);
}

/**
 * Chuẩn hoá mã khách nhập vào ô tra cứu: viết hoa, bỏ khoảng trắng, và tự thêm
 * dấu gạch nếu khách gõ liền. Khách sẽ gõ "dc2607261a2b" và vẫn phải tìm được đơn.
 */
export function normalizeOrderCode(input: string): string {
  const cleaned = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 12 || !cleaned.startsWith(ORDER_CODE_PREFIX)) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 8)}-${cleaned.slice(8)}`;
}
