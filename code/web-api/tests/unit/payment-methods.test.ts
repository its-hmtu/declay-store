import { describe, it, expect } from 'vitest';
import { methodsForRegion, availablePaymentMethods } from '@/modules/payment/payment.methods';
import { paymentReference } from '@/modules/payment-provider/bank-transfer.provider';

describe('methodsForRegion', () => {
  it('domestic offers vnpay, bank_transfer, cod (not stripe)', () => {
    const ids = methodsForRegion('domestic').map((m) => m.id);
    expect(ids).toEqual(['vnpay', 'bank_transfer', 'cod']);
  });
  it('international offers vnpay and stripe only (no cod/bank_transfer)', () => {
    const ids = methodsForRegion('international').map((m) => m.id);
    expect(ids).toEqual(['vnpay', 'stripe']);
  });
});

describe('availablePaymentMethods', () => {
  it('filters by enabled config within the region', () => {
    const ids = availablePaymentMethods('domestic', ['bank_transfer', 'cod']).map((m) => m.id);
    expect(ids).toEqual(['bank_transfer', 'cod']);
  });
  it('drops enabled methods not valid for the region', () => {
    const ids = availablePaymentMethods('international', ['cod', 'stripe']).map((m) => m.id);
    expect(ids).toEqual(['stripe']); // cod is domestic-only
  });
});

describe('paymentReference', () => {
  it('encodes the order id for bank memo matching', () => {
    expect(paymentReference(42)).toBe('DECLAY42');
  });
});
