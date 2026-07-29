import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Effective (lowest valid) unit price: special price when set and cheaper, else base.
export function effectivePrice(
  price?: string | null,
  specialPrice?: string | null,
  campaignPercent?: number | null,
): number {
  const base = parseFloat(price ?? '0');
  let best = base;
  if (specialPrice != null) {
    const special = parseFloat(specialPrice);
    if (Number.isFinite(special) && special >= 0 && special < best) best = special;
  }
  if (campaignPercent != null && campaignPercent > 0 && campaignPercent <= 100) {
    const campaignPrice = base * (1 - campaignPercent / 100);
    if (campaignPrice < best) best = campaignPrice;
  }
  return best;
}

/**
 * M-15: cửa hàng niêm yết bằng VND. Mọi nơi hiển thị tiền đều đi qua đây để
 * định dạng không bị lệch giữa các màn hình (1.300.000 ₫).
 */
export function formatPrice(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}

/**
 * M-16: nhãn hiển thị của đơn hàng.
 * Đơn tạo trước khi có mã (dữ liệu cũ) mới rơi về id — không để trang trống.
 */
export function orderLabel(order: { orderCode?: string | null; id: number }): string {
  return order.orderCode || `#${order.id}`;
}

/** Trang tra cứu vận đơn công khai của GHN. */
export function ghnTrackingUrl(trackingNumber: string): string {
  return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trackingNumber)}`;
}
