import { describe, it, expect } from 'vitest';
import { isPrepaidMethod, initialOrderStatusFor } from '@/modules/order/order.payment';

describe('order payment method rules (M-02)', () => {
  it('COD is not prepaid and starts at processing', () => {
    expect(isPrepaidMethod('cod')).toBe(false);
    expect(initialOrderStatusFor('cod')).toBe('processing');
  });
  it('Stripe is prepaid and starts at pending_payment', () => {
    expect(isPrepaidMethod('stripe')).toBe(true);
    expect(initialOrderStatusFor('stripe')).toBe('pending_payment');
  });
});
