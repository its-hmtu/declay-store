import type { PaymentProvider } from './provider';
import { BankTransferProvider } from './bank-transfer.provider';

const providers: Record<string, PaymentProvider> = {
  bank_transfer: new BankTransferProvider(),
  // vnpay: new VNPayProvider(...),  // added in a later increment (sandbox)
};

export function getPaymentProvider(method: string): PaymentProvider | null {
  return providers[method] ?? null;
}

export * from './provider';
