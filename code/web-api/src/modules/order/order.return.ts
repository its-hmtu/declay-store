/**
 * M-29e: logic trả hàng lỗi — thuần, không I/O, để test.
 *
 * Chỉ nhận trả hàng LỖI/SAI (P4), theo từng món (P6). Hoàn tiền = tiền hàng của
 * các món trả; nếu trả TOÀN BỘ đơn thì cộng cả phí ship gốc (P9/A2), trả một
 * phần thì không.
 */

export interface ReturnLine {
  orderItemId: number;
  quantity: number;
  photoUrls: string[];
  reason?: string | null;
}

export interface PurchasedLine {
  purchased: number;
  alreadyReturned: number;
  unitPrice: number;
}

/** Kiểm tra hợp lệ của các dòng trả. Trả null nếu hợp lệ, hoặc thông báo lỗi. */
export function validateReturnLines(
  lines: ReturnLine[],
  purchased: Map<number, PurchasedLine>,
): string | null {
  if (!lines || lines.length === 0) return 'Chọn ít nhất một món để trả.';
  for (const l of lines) {
    const p = purchased.get(l.orderItemId);
    if (!p) return `Món #${l.orderItemId} không thuộc đơn này.`;
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) return 'Số lượng trả phải là số nguyên dương.';
    if (l.quantity > p.purchased - p.alreadyReturned) {
      return `Món #${l.orderItemId}: vượt quá số lượng có thể trả (còn ${p.purchased - p.alreadyReturned}).`;
    }
    // BR-R2: bằng chứng bắt buộc.
    if (!l.photoUrls || l.photoUrls.length === 0) return 'Mỗi món trả phải kèm ít nhất một ảnh.';
  }
  return null;
}

/** Tổng tiền hàng của các dòng trả. */
export function returnItemsSubtotal(lines: { unitPrice: number; quantity: number }[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

/** Sau lần trả này, toàn bộ số lượng của đơn đã được trả hết chưa? */
export function isWholeOrderReturn(
  totalPurchasedUnits: number,
  priorReturnedUnits: number,
  thisUnits: number,
): boolean {
  return totalPurchasedUnits > 0 && priorReturnedUnits + thisUnits >= totalPurchasedUnits;
}

/** P9/A2: trả toàn bộ -> hoàn cả ship; trả một phần -> chỉ tiền hàng. */
export function returnRefundTotal(itemsSubtotal: number, wholeOrder: boolean, shippingFee: number): number {
  return Math.round(itemsSubtotal + (wholeOrder ? shippingFee : 0));
}
