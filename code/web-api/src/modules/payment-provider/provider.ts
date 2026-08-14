/** Carrier-agnostic payment provider abstraction (W-26). */

export interface PaymentInitInput {
  orderId: number;
  amount: number;
  currency: string;
}

export interface PaymentInitResult {
  method: string;
  reference: string;                 // matching reference (encodes order id)
  redirectUrl?: string;              // gateways (VNPay/Stripe redirect)
  qrImageUrl?: string;               // VietQR image
  instructions?: string;             // human-readable payment instructions
  requiresManualConfirmation: boolean;
}

export interface PaymentProvider {
  readonly method: string;
  init(input: PaymentInitInput): Promise<PaymentInitResult>;
}
