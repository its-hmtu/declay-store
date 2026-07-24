/**
 * Region-aware payment method catalogue (W-26). Pure + testable: no I/O.
 * The checkout offers only methods that are (a) valid for the destination region
 * and (b) enabled by configuration.
 */

export type PaymentRegion = 'domestic' | 'international';
export type PaymentMethodId = 'vnpay' | 'bank_transfer' | 'cod' | 'stripe';

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  regions: PaymentRegion[];
  kind: 'gateway' | 'manual' | 'cod';
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { id: 'vnpay',         label: 'VNPay (cards / QR / wallets)', regions: ['domestic', 'international'], kind: 'gateway' },
  { id: 'bank_transfer', label: 'Bank transfer (VietQR)',        regions: ['domestic'],                  kind: 'manual' },
  { id: 'cod',           label: 'Cash on delivery',              regions: ['domestic'],                  kind: 'cod' },
  { id: 'stripe',        label: 'Card (Stripe)',                 regions: ['international'],              kind: 'gateway' },
];

export function methodsForRegion(region: PaymentRegion): PaymentMethodMeta[] {
  return PAYMENT_METHODS.filter((m) => m.regions.includes(region));
}

/** Methods valid for the region AND enabled by config. Order follows PAYMENT_METHODS. */
export function availablePaymentMethods(region: PaymentRegion, enabled: PaymentMethodId[]): PaymentMethodMeta[] {
  const set = new Set(enabled);
  return methodsForRegion(region).filter((m) => set.has(m.id));
}
