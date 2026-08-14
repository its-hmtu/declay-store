import config from '@/config/env';
import type { PaymentProvider, PaymentInitInput, PaymentInitResult } from './provider';

/** Transfer reference put in the bank memo so admins can match the payment to the order. */
export function paymentReference(orderId: number): string {
  return `DECLAY${orderId}`;
}

/**
 * Manual bank transfer via VietQR — lets the shop accept domestic payments immediately
 * without any gateway/entity. Generates a VietQR quick-link image; admin confirms receipt.
 */
export class BankTransferProvider implements PaymentProvider {
  readonly method = 'bank_transfer';

  async init({ orderId, amount }: PaymentInitInput): Promise<PaymentInitResult> {
    const { bankId, accountNo, accountName } = config.bankTransfer;
    const reference = paymentReference(orderId);
    const qrImageUrl = bankId && accountNo
      ? `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png`
        + `?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(reference)}`
        + `&accountName=${encodeURIComponent(accountName || '')}`
      : undefined;
    return {
      method: 'bank_transfer',
      reference,
      qrImageUrl,
      instructions: `Chuyển khoản tới ${accountName || '(chưa cấu hình tên)'} — STK ${accountNo || '(chưa cấu hình)'} với nội dung "${reference}".`,
      requiresManualConfirmation: true,
    };
  }
}
