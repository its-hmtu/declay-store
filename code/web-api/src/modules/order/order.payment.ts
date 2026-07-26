/**
 * Payment-method rules for checkout (MVP / M-02). Pure + testable.
 * COD skips prepayment and goes straight to `processing` (BR-03); prepaid methods
 * (Stripe/VNPay) start at `pending_payment` and advance to `processing` on payment.
 */
export type CheckoutPaymentMethod = 'cod' | 'stripe' | 'vnpay';

export function isPrepaidMethod(method: CheckoutPaymentMethod): boolean {
  return method !== 'cod';
}

export function initialOrderStatusFor(method: CheckoutPaymentMethod): 'processing' | 'pending_payment' {
  return method === 'cod' ? 'processing' : 'pending_payment';
}
