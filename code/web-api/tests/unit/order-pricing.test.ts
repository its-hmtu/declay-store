import { describe, it, expect } from 'vitest';
import {
  resolveShippingZone, methodAppliesToZone, computeShippingFee, computeOrderTotal,
  isTerminalStatus, statusTransitionError,
} from '@/modules/order/order.pricing';

describe('resolveShippingZone (W-15)', () => {
  it('treats Vietnam / empty as domestic', () => {
    const domestic: (string | null | undefined)[] = ['', undefined, null, 'VN', 'Vietnam', 'viet nam', 'Việt Nam', '  vn  '];
    for (const c of domestic) expect(resolveShippingZone(c)).toBe('domestic');
  });
  it('treats other countries as international', () => {
    for (const c of ['US', 'United States', 'Japan']) expect(resolveShippingZone(c)).toBe('international');
  });
});

describe('methodAppliesToZone (W-15)', () => {
  it('"all" applies to every zone', () => {
    expect(methodAppliesToZone('all', 'domestic')).toBe(true);
    expect(methodAppliesToZone('all', 'international')).toBe(true);
  });
  it('a zoned method only applies to its zone', () => {
    expect(methodAppliesToZone('international', 'international')).toBe(true);
    expect(methodAppliesToZone('international', 'domestic')).toBe(false);
    expect(methodAppliesToZone('domestic', 'international')).toBe(false);
  });
});

describe('computeShippingFee (W-15)', () => {
  it('charges the fee below the free-over threshold', () => {
    expect(computeShippingFee(50, { zone: 'all', fee: 5, freeOver: 75 })).toBe(5);
  });
  it('is free at or above the free-over threshold', () => {
    expect(computeShippingFee(75, { zone: 'all', fee: 5, freeOver: 75 })).toBe(0);
    expect(computeShippingFee(100, { zone: 'all', fee: 5, freeOver: 75 })).toBe(0);
  });
  it('always charges when there is no free-over', () => {
    expect(computeShippingFee(1000, { zone: 'all', fee: 12, freeOver: null })).toBe(12);
  });
  it('coerces string decimals from Sequelize', () => {
    expect(computeShippingFee(10, { zone: 'all', fee: '5.00', freeOver: '75.00' })).toBe(5);
  });
});

describe('computeOrderTotal (W-14)', () => {
  it('computes subtotal - discount + shipping, rounded to cents', () => {
    expect(computeOrderTotal(100, 10, 5)).toBe(95);
    expect(computeOrderTotal(29.99, 0, 5)).toBe(34.99);
    expect(computeOrderTotal(10.005, 0, 0)).toBe(10.01);
  });
});

describe('statusTransitionError (W-21)', () => {
  it('allows forward transitions', () => {
    expect(statusTransitionError('paid', 'processing')).toBeNull();
    expect(statusTransitionError('processing', 'delivered')).toBeNull();
  });
  it('blocks backward transitions', () => {
    expect(statusTransitionError('shipped', 'processing')).toMatch(/back to/);
    expect(statusTransitionError('processing', 'paid')).toMatch(/back to/);
  });
  it('blocks a no-op (same status)', () => {
    expect(statusTransitionError('processing', 'processing')).toMatch(/back to/);
  });
  it('locks terminal states', () => {
    expect(statusTransitionError('delivered', 'processing')).toMatch(/can no longer change/);
    expect(statusTransitionError('cancelled', 'paid')).toMatch(/can no longer change/);
  });
  it('allows cancelling from a non-terminal state', () => {
    expect(statusTransitionError('paid', 'cancelled')).toBeNull();
    expect(statusTransitionError('pending_payment', 'cancelled')).toBeNull();
  });
  it('isTerminalStatus flags delivered/cancelled', () => {
    expect(isTerminalStatus('delivered')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('paid')).toBe(false);
  });
});
