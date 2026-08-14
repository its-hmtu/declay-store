import { describe, it, expect } from 'vitest';
import { effectiveUnitPrice, round2 } from '@/lib/pricing';

describe('effectiveUnitPrice — special price (pricing increment 1)', () => {
  it('uses the special price when set and cheaper', () => {
    expect(effectiveUnitPrice(30, 22)).toBe(22);
    expect(effectiveUnitPrice('30.00', '22.50')).toBe(22.5);
  });
  it('ignores the special price when >= base', () => {
    expect(effectiveUnitPrice(30, 30)).toBe(30);
    expect(effectiveUnitPrice(30, 35)).toBe(30);
  });
  it('falls back to base when special is null/undefined', () => {
    expect(effectiveUnitPrice(30, null)).toBe(30);
    expect(effectiveUnitPrice(30)).toBe(30);
  });
  it('ignores invalid/negative special values', () => {
    expect(effectiveUnitPrice(30, -5)).toBe(30);
    expect(effectiveUnitPrice(30, Number.NaN)).toBe(30);
  });
  it('applies a campaign percent on the base price', () => {
    expect(effectiveUnitPrice(100, null, 20)).toBe(80);
    expect(effectiveUnitPrice('50.00', null, 10)).toBe(45);
  });
  it('picks the best of special vs campaign (lowest wins)', () => {
    expect(effectiveUnitPrice(100, 70, 20)).toBe(70); // special 70 < campaign 80
    expect(effectiveUnitPrice(100, 90, 20)).toBe(80); // campaign 80 < special 90
  });
  it('ignores an out-of-range campaign percent', () => {
    expect(effectiveUnitPrice(100, null, 0)).toBe(100);
    expect(effectiveUnitPrice(100, null, 150)).toBe(100);
    expect(effectiveUnitPrice(100, null, null)).toBe(100);
  });

  it('rounds to cents', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(effectiveUnitPrice(10.005, null)).toBe(10.01);
  });
});
