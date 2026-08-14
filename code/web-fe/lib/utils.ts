import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface VariantPricing {
  basePrice: number;
  effectivePrice: number;
  discountPercent: number;
  onSale: boolean;
  source: 'base' | 'special' | 'campaign';
}

/** Shape we need off a variant. Loose on purpose — cart, product and order items differ. */
type PricedVariant = {
  price?: string | number | null;
  specialPrice?: string | number | null;
  basePrice?: number;
  effectivePrice?: number;
  discountPercent?: number;
  onSale?: boolean;
  source?: 'base' | 'special' | 'campaign';
} | null | undefined;

/**
 * M-40: read the price the SERVER decided.
 *
 * `web-api/src/lib/pricing.ts` is the single source of truth and stamps
 * `effectivePrice`/`discountPercent`/`onSale`/`source` onto every variant it serves.
 * This function just reads them. The fallback below only exists for payloads that
 * predate the decoration (admin endpoints, cached responses) — it mirrors the server
 * rule exactly, rounding included. Do not add pricing logic anywhere else.
 */
export function pricingOf(variant: PricedVariant, campaignPercent?: number | null): VariantPricing {
  const base = round2(Number(variant?.basePrice ?? variant?.price ?? 0));

  // Server already decided — trust it.
  if (variant?.effectivePrice != null) {
    const effective = round2(Number(variant.effectivePrice));
    return {
      basePrice: base,
      effectivePrice: effective,
      discountPercent: variant.discountPercent ?? (base > 0 && effective < base ? Math.round((1 - effective / base) * 100) : 0),
      onSale: variant.onSale ?? effective < base,
      source: variant.source ?? (effective < base ? 'campaign' : 'base'),
    };
  }

  // Fallback: mirrors computeVariantPricing() on the server.
  let best = base;
  let source: 'base' | 'special' | 'campaign' = 'base';
  const special = variant?.specialPrice == null ? null : Number(variant.specialPrice);
  if (special != null && Number.isFinite(special) && special >= 0 && special < best) {
    best = special;
    source = 'special';
  }
  if (campaignPercent != null && campaignPercent > 0 && campaignPercent <= 100) {
    const campaignPrice = base * (1 - campaignPercent / 100);
    if (campaignPrice < best) {
      best = campaignPrice;
      source = 'campaign';
    }
  }
  const effective = round2(best);
  return {
    basePrice: base,
    effectivePrice: effective,
    discountPercent: base > 0 && effective < base ? Math.round((1 - effective / base) * 100) : 0,
    onSale: effective < base,
    source,
  };
}

/** Convenience for the many call sites that only need the number. */
export function effectivePrice(variant: PricedVariant, campaignPercent?: number | null): number {
  return pricingOf(variant, campaignPercent).effectivePrice;
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
