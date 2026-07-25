import { describe, it, expect } from 'vitest';
import { canSeeCost, stripCostFields } from '@/modules/product-variant/variant.visibility';

describe('canSeeCost (M-04 / BR-09)', () => {
  it('allows admin and super_admin', () => {
    expect(canSeeCost('admin')).toBe(true);
    expect(canSeeCost('super_admin')).toBe(true);
  });
  it('denies staff/editor, unknown roles and missing role', () => {
    expect(canSeeCost('editor')).toBe(false);
    expect(canSeeCost('viewer')).toBe(false);
    expect(canSeeCost(undefined)).toBe(false);
    expect(canSeeCost(null)).toBe(false);
  });
});

describe('stripCostFields', () => {
  const row = { id: 1, name: 'M', price: 100, costPrice: 60, margin: 40, marginPercent: 40 };

  it('keeps everything for admin', () => {
    expect(stripCostFields({ ...row }, 'admin')).toEqual(row);
  });
  it('removes cost and margin for staff', () => {
    expect(stripCostFields({ ...row }, 'editor')).toEqual({ id: 1, name: 'M', price: 100 });
  });
  it('removes cost and margin when the role is missing', () => {
    expect(stripCostFields({ ...row })).toEqual({ id: 1, name: 'M', price: 100 });
  });
});
