import { describe, it, expect } from 'vitest';
import { reconcileCod, canReconcile } from '@/modules/payment/cod.reconcile';

describe('reconcileCod (M-07 / BR-11)', () => {
  it('matches when the collected cash equals the total', () => {
    expect(reconcileCod(250000, 250000)).toEqual({ outcome: 'matched', difference: 0 });
  });
  it('tolerates a one-cent rounding difference', () => {
    expect(reconcileCod('100.00', '100.01')).toEqual({ outcome: 'matched', difference: 0 });
  });
  it('flags a shortfall with a negative difference', () => {
    expect(reconcileCod(100, 90)).toEqual({ outcome: 'short', difference: -10 });
  });
  it('flags an overpayment', () => {
    expect(reconcileCod(100, 130)).toEqual({ outcome: 'over', difference: 30 });
  });
});

describe('canReconcile', () => {
  it('allows delivered and returned orders', () => {
    expect(canReconcile('delivered', false)).toBeNull();
    expect(canReconcile('returned', false)).toBeNull();
  });
  it('blocks orders that have not been delivered', () => {
    expect(canReconcile('shipped', false)).toContain('after delivery');
    expect(canReconcile('processing', false)).toContain('after delivery');
  });
  it('blocks a second reconciliation', () => {
    expect(canReconcile('delivered', true)).toContain('already been reconciled');
  });
});
