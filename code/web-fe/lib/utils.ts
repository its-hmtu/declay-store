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
