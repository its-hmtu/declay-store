import { createHmac } from 'node:crypto';

/**
 * VNPay signing rules (M-12). Pure + testable — this is the security core:
 * a wrong signature means either rejected payments or, worse, accepting forged ones.
 *
 * Rules (VNPay spec v2.1.0):
 *  - drop vnp_SecureHash / vnp_SecureHashType before signing
 *  - drop empty values
 *  - sort parameters alphabetically by key
 *  - URL-encode values, encoding spaces as "+" (querystring.stringify behaviour)
 *  - HMAC-SHA512 over "key=value&key=value", hex, lowercase
 */
export type VnpParams = Record<string, string | number | undefined | null>;

export function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

/** Canonical string that gets signed. */
export function buildSignData(params: VnpParams): string {
  return Object.entries(params)
    .filter(([key, value]) =>
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      value !== undefined && value !== null && String(value) !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${encodeValue(String(value))}`)
    .join('&');
}

export function signParams(params: VnpParams, secret: string): string {
  return createHmac('sha512', secret).update(buildSignData(params), 'utf-8').digest('hex');
}

/**
 * Constant-time-ish comparison of the returned hash. Case-insensitive because
 * VNPay has historically returned upper and lower case hex.
 */
export function verifySignature(params: VnpParams, secret: string, receivedHash?: string): boolean {
  if (!receivedHash) return false;
  const expected = signParams(params, secret);
  const a = expected.toLowerCase();
  const b = receivedHash.toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** VNPay timestamp format: yyyyMMddHHmmss in Asia/Ho_Chi_Minh. */
export function vnpDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

// Quy đổi tiền tệ + nhân 100 nằm ở ./vnpay.fx — module này chỉ lo chữ ký.

/** Order info must be ASCII without special characters (VNPay rule). */
export function sanitizeOrderInfo(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
