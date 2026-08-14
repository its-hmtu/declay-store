/**
 * M-44: presentation logic for campaigns.
 *
 * Campaigns deliberately have no page of their own — they are a filter over the
 * shop (`/products?campaignId=N`). What they DO need is to be visible, which is
 * what this module supports: the announcement bar, the product-card badge and the
 * countdown ribbon on a product page.
 *
 * Pure — no React, no network — so the urgency rules can be tested. Getting a
 * countdown wrong is worse than not having one: telling a customer a sale ends in
 * "1 day" when it ended an hour ago is a promise the checkout will not keep.
 */

export interface ActiveCampaign {
  id: number;
  name: string;
  discountPercent: number;
  endsAt?: string | Date | null;
}

/** Where the customer goes when they tap a campaign. */
export function campaignHref(campaignId: number): string {
  return `/products?campaignId=${campaignId}`;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  /** Total ms remaining; 0 once expired. */
  totalMs: number;
  expired: boolean;
}

/**
 * Time left until `endsAt`. An open-ended campaign (no end date) returns null —
 * the caller must render no countdown at all rather than a fake deadline.
 */
export function countdownTo(endsAt?: string | Date | null, now: Date = new Date()): Countdown | null {
  if (!endsAt) return null;

  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;

  const totalMs = Math.max(0, end - now.getTime());
  const minutesTotal = Math.floor(totalMs / 60_000);

  return {
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
    totalMs,
    expired: totalMs === 0,
  };
}

/**
 * Below this, a countdown creates real urgency. Above it, "ends in 26 days" is
 * noise that trains customers to ignore the bar.
 */
export const URGENCY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldShowCountdown(countdown: Countdown | null): boolean {
  return !!countdown && !countdown.expired && countdown.totalMs <= URGENCY_WINDOW_MS;
}

/** Coarse label for a countdown; the component wraps it in translated copy. */
export function countdownLabel(countdown: Countdown | null): string | null {
  if (!countdown || countdown.expired) return null;
  if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h`;
  if (countdown.hours > 0) return `${countdown.hours}h ${countdown.minutes}m`;
  return `${countdown.minutes}m`;
}

/**
 * Which campaign the announcement bar should show when several are running.
 * Ending soonest wins — that is the one a customer can still miss. Ties break on
 * the deeper discount, then the lower id so the bar does not flip between renders.
 */
export function pickHeadlineCampaign(
  campaigns: ActiveCampaign[],
  now: Date = new Date(),
): ActiveCampaign | null {
  const live = campaigns.filter((c) => {
    const countdown = countdownTo(c.endsAt, now);
    return !countdown || !countdown.expired;
  });
  if (!live.length) return null;

  return [...live].sort((a, b) => {
    const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aEnd !== bEnd) return aEnd - bEnd;
    if (a.discountPercent !== b.discountPercent) return b.discountPercent - a.discountPercent;
    return a.id - b.id;
  })[0];
}

export type SaleSource = 'base' | 'special' | 'campaign';

/**
 * What the discount badge should say. `source` comes from the server
 * (`lib/pricing.ts`) — the frontend must not re-derive why a price is reduced.
 *
 * A campaign gets its name because "Tet Sale −30%" is a reason to buy, while a
 * bare "−30%" is just a number. A permanent special price stays generic.
 */
export function badgeFor(
  source: SaleSource | undefined,
  discountPercent: number,
  campaignName?: string | null,
): { text: string; kind: 'campaign' | 'sale' } | null {
  if (!discountPercent || discountPercent <= 0) return null;
  if (source === 'campaign' && campaignName) {
    return { text: `${campaignName} −${discountPercent}%`, kind: 'campaign' };
  }
  return { text: `−${discountPercent}%`, kind: 'sale' };
}
