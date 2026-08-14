/**
 * M-19: dữ liệu hiển thị trên trang cảm ơn — hàm thuần, test được.
 *
 * Trang cảm ơn là màn hình cuối cùng khách nhìn thấy. Với khách vãng lai nó
 * còn là màn hình DUY NHẤT có nội dung đơn, nên phải trả lời được ba câu hỏi:
 * "mình đã mua gì", "hết bao nhiêu tiền", "hàng về đâu và khi nào".
 */

/**
 * Che bớt email trước khi trả ra ngoài.
 *
 * Vì sao không trả nguyên: endpoint này mở theo chữ ký thanh toán hoặc token
 * đơn hàng — đủ an toàn cho người mua, nhưng email đầy đủ là thứ không cần
 * thiết phải phơi ra để phục vụ mục đích "xác nhận tôi gõ đúng địa chỉ chưa".
 * Che phần giữa vẫn đủ để khách nhận ra email của mình.
 *
 *   nguyenvana@gmail.com -> ng*******na@gmail.com
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at <= 0) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at);

  // Quá ngắn thì không đủ ký tự để che có ý nghĩa — giữ ký tự đầu.
  if (local.length <= 2) return `${local[0]}*${domain}`;
  if (local.length <= 4) return `${local.slice(0, 1)}${'*'.repeat(local.length - 1)}${domain}`;

  return `${local.slice(0, 2)}${'*'.repeat(local.length - 4)}${local.slice(-2)}${domain}`;
}

/** Gộp địa chỉ thành một dòng để in lên nhãn và hiển thị. */
export function formatAddressLine(parts: {
  addressLine?: string | null;
  addressLine2?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  return [parts.addressLine, parts.addressLine2, parts.ward, parts.district, parts.city]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Tổng số sản phẩm (đếm theo số lượng, không phải số dòng). */
export function countItems(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
}
