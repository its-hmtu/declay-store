/**
 * Shipping time estimation. Picks a carrier and lead time from the destination,
 * and computes the estimated delivery date shown to the customer.
 *
 * `leadTimeDays` is the real calendar estimate (for display). The fulfillment
 * worker compresses it into observable durations via `config.shipping.dayMs`.
 */

export interface ShippingAddressLike {
  city?: string | null;
  country?: string | null;
}

export interface ShippingEstimate {
  carrier: string;
  trackingNumber: string;
  leadTimeDays: number;
  estimatedDeliveryAt: Date;
}

const MAJOR_VN_CITIES = ['ho chi minh', 'hồ chí minh', 'hanoi', 'ha noi', 'hà nội', 'da nang', 'đà nẵng', 'danang'];
const DAY_MS = 24 * 60 * 60 * 1000;

function generateTracking(prefix: string): string {
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `${prefix}${Date.now().toString(36).toUpperCase()}${rand}`;
}

export function estimateShipping(
  address: ShippingAddressLike | null | undefined,
  shippedAt: Date = new Date(),
): ShippingEstimate {
  const country = (address?.country ?? 'Vietnam').toLowerCase();
  const city = (address?.city ?? '').toLowerCase();
  const isDomestic = country.includes('viet') || country === 'vn';

  let leadTimeDays: number;
  let carrier: string;
  let prefix: string;

  if (!isDomestic) {
    leadTimeDays = 7;
    carrier = 'DHL Express';
    prefix = 'INTL';
  } else if (MAJOR_VN_CITIES.some((c) => city.includes(c))) {
    leadTimeDays = 2;
    carrier = 'GHN Express';
    prefix = 'VN';
  } else {
    leadTimeDays = 4;
    carrier = 'GHN Standard';
    prefix = 'VN';
  }

  return {
    carrier,
    trackingNumber: generateTracking(prefix),
    leadTimeDays,
    estimatedDeliveryAt: new Date(shippedAt.getTime() + leadTimeDays * DAY_MS),
  };
}
