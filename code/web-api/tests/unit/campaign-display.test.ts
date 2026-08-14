/**
 * Campaign presentation rules live in the frontend (`web-fe/lib/campaign-display.ts`),
 * which has no test runner yet (W-45). Imported by relative path so the real module
 * is exercised — a copy here would drift. Move once W-45 lands.
 */
import { describe, it, expect } from 'vitest';
import {
  countdownTo, countdownLabel, shouldShowCountdown, pickHeadlineCampaign,
  badgeFor, campaignHref, URGENCY_WINDOW_MS,
} from '../../../web-fe/lib/campaign-display';

const NOW = new Date('2026-08-06T12:00:00Z');
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

describe('campaignHref', () => {
  it('points at the shop filter, not a campaign page', () => {
    // Campaigns intentionally have no page of their own.
    expect(campaignHref(7)).toBe('/products?campaignId=7');
  });
});

describe('countdownTo', () => {
  it('breaks the remaining time down', () => {
    const c = countdownTo(inHours(50), NOW)!;
    expect(c.days).toBe(2);
    expect(c.hours).toBe(2);
    expect(c.expired).toBe(false);
  });

  it('returns null for an open-ended campaign', () => {
    // No end date means no deadline — inventing one would be a lie.
    expect(countdownTo(null, NOW)).toBeNull();
    expect(countdownTo(undefined, NOW)).toBeNull();
  });

  it('returns null for an unparseable date rather than NaN', () => {
    expect(countdownTo('not-a-date', NOW)).toBeNull();
  });

  it('clamps a past deadline to expired, never negative', () => {
    const c = countdownTo(inHours(-5), NOW)!;
    expect(c.expired).toBe(true);
    expect(c.totalMs).toBe(0);
    expect(c.days).toBe(0);
  });
});

describe('shouldShowCountdown', () => {
  it('shows a deadline inside the urgency window', () => {
    expect(shouldShowCountdown(countdownTo(inHours(10), NOW))).toBe(true);
  });

  it('hides a distant deadline', () => {
    // "Ends in 26 days" is noise that trains people to ignore the bar.
    expect(shouldShowCountdown(countdownTo(inHours(24 * 26), NOW))).toBe(false);
  });

  it('hides an expired or absent deadline', () => {
    expect(shouldShowCountdown(countdownTo(inHours(-1), NOW))).toBe(false);
    expect(shouldShowCountdown(null)).toBe(false);
  });

  it('uses a 3-day window', () => {
    expect(URGENCY_WINDOW_MS).toBe(3 * 24 * 3600_000);
  });
});

describe('countdownLabel', () => {
  it('drops to finer units as the deadline nears', () => {
    expect(countdownLabel(countdownTo(inHours(50), NOW))).toBe('2d 2h');
    expect(countdownLabel(countdownTo(inHours(5), NOW))).toBe('5h 0m');
    expect(countdownLabel(countdownTo(0.5, NOW))).toBeNull(); // invalid input
  });

  it('says nothing once expired', () => {
    expect(countdownLabel(countdownTo(inHours(-1), NOW))).toBeNull();
  });
});

describe('pickHeadlineCampaign', () => {
  const base = { name: 'X', discountPercent: 10 };

  it('prefers the campaign ending soonest — that is the one you can still miss', () => {
    const picked = pickHeadlineCampaign([
      { ...base, id: 1, endsAt: inHours(72) },
      { ...base, id: 2, endsAt: inHours(6) },
    ], NOW);
    expect(picked?.id).toBe(2);
  });

  it('treats an open-ended campaign as least urgent', () => {
    const picked = pickHeadlineCampaign([
      { ...base, id: 1, endsAt: null },
      { ...base, id: 2, endsAt: inHours(200) },
    ], NOW);
    expect(picked?.id).toBe(2);
  });

  it('breaks a tie on the deeper discount', () => {
    const picked = pickHeadlineCampaign([
      { id: 1, name: 'A', discountPercent: 10, endsAt: inHours(6) },
      { id: 2, name: 'B', discountPercent: 40, endsAt: inHours(6) },
    ], NOW);
    expect(picked?.id).toBe(2);
  });

  it('is deterministic on a full tie so the bar does not flicker', () => {
    const campaigns = [
      { id: 9, name: 'A', discountPercent: 10, endsAt: inHours(6) },
      { id: 3, name: 'B', discountPercent: 10, endsAt: inHours(6) },
    ];
    expect(pickHeadlineCampaign(campaigns, NOW)?.id).toBe(3);
    expect(pickHeadlineCampaign([...campaigns].reverse(), NOW)?.id).toBe(3);
  });

  it('ignores expired campaigns', () => {
    expect(pickHeadlineCampaign([{ ...base, id: 1, endsAt: inHours(-1) }], NOW)).toBeNull();
  });

  it('returns null when nothing is running', () => {
    expect(pickHeadlineCampaign([], NOW)).toBeNull();
  });
});

describe('badgeFor', () => {
  it('names the campaign when the campaign set the price', () => {
    // "Tet Sale −30%" is a reason to buy; "−30%" is just a number.
    expect(badgeFor('campaign', 30, 'Tet Sale')).toEqual({ text: 'Tet Sale −30%', kind: 'campaign' });
  });

  it('stays generic for an ordinary special price', () => {
    expect(badgeFor('special', 25, 'Tet Sale')).toEqual({ text: '−25%', kind: 'sale' });
  });

  it('falls back to a plain badge when the campaign has no name', () => {
    expect(badgeFor('campaign', 30, null)).toEqual({ text: '−30%', kind: 'sale' });
  });

  it('renders nothing when there is no discount', () => {
    expect(badgeFor('base', 0)).toBeNull();
    expect(badgeFor(undefined, 0, 'Tet Sale')).toBeNull();
  });
});
