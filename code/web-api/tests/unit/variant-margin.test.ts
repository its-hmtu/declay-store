import { describe, it, expect } from 'vitest';
import { computeMargin } from '@/modules/product-variant/variant.margin';

describe('computeMargin (M-03)', () => {
  it('computes profit and percentage from the effective price', () => {
    expect(computeMargin(200, 120)).toEqual({ margin: 80, marginPercent: 40 });
  });
  it('accepts string decimals and rounds to cents / one decimal', () => {
    expect(computeMargin('99.99', '33.33')).toEqual({ margin: 66.66, marginPercent: 66.7 });
  });
  it('handles a loss (negative margin)', () => {
    expect(computeMargin(100, 130)).toEqual({ margin: -30, marginPercent: -30 });
  });
  it('returns null when there is no cost price', () => {
    expect(computeMargin(100, null)).toBeNull();
    expect(computeMargin(100, undefined)).toBeNull();
  });
  it('returns null for invalid input', () => {
    expect(computeMargin(0, 10)).toBeNull();
    expect(computeMargin('abc', 10)).toBeNull();
  });
});
