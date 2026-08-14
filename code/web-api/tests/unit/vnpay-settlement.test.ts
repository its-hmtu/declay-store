import { describe, it, expect } from 'vitest';
import {
  decideSettlement, normalizeTransactionStatus, type SettlementInput,
} from '@/modules/payment-provider/vnpay/vnpay.settlement';

const ok: SettlementInput = {
  signatureValid: true,
  orderId: 42,
  orderExists: true,
  orderStatus: 'pending_payment',
  snapshotAmountVnd: 9_100_000,
  receivedVnpAmount: 910_000_000,
  responseCode: '00',
  transactionStatus: '00',
};

describe('decideSettlement (M-12)', () => {
  it('settles a valid successful payment', () => {
    expect(decideSettlement(ok)).toEqual({ rspCode: '00', message: 'Confirm Success', action: 'settle' });
  });

  it('rejects a forged result (bad signature) without touching the order', () => {
    const d = decideSettlement({ ...ok, signatureValid: false });
    expect(d.rspCode).toBe('97');
    expect(d.action).toBe('none');
  });

  it('rejects an unknown order', () => {
    expect(decideSettlement({ ...ok, orderExists: false }).rspCode).toBe('01');
    expect(decideSettlement({ ...ok, orderId: null }).rspCode).toBe('01');
  });

  it('refuses to guess when the amount snapshot is missing', () => {
    const d = decideSettlement({ ...ok, snapshotAmountVnd: null });
    expect(d.rspCode).toBe('01');
    expect(d.action).toBe('none');
  });

  it('rejects a tampered amount — the fraud case', () => {
    const d = decideSettlement({ ...ok, receivedVnpAmount: 100 });
    expect(d.rspCode).toBe('04');
    expect(d.action).toBe('none');
  });

  it('is idempotent: an already-paid order is acknowledged with no side effect', () => {
    const d = decideSettlement({ ...ok, orderStatus: 'paid' });
    expect(d.rspCode).toBe('02');
    expect(d.action).toBe('none');
  });

  it('does not settle when the bank declined', () => {
    const d = decideSettlement({ ...ok, responseCode: '24', transactionStatus: '02' });
    expect(d.action).toBe('mark_failed');
    expect(d.rspCode).toBe('00'); // vẫn ack để VNPay ngừng retry
  });

  it('does not settle when only one of the two codes is 00', () => {
    expect(decideSettlement({ ...ok, transactionStatus: '02' }).action).toBe('mark_failed');
    expect(decideSettlement({ ...ok, responseCode: '07' }).action).toBe('mark_failed');
  });

  it('checks the signature before anything else', () => {
    const d = decideSettlement({ ...ok, signatureValid: false, orderExists: false, receivedVnpAmount: 1 });
    expect(d.rspCode).toBe('97');
  });
});

describe('normalizeTransactionStatus', () => {
  it('falls back to the response code when the return URL omits it', () => {
    expect(normalizeTransactionStatus('00', null)).toBe('00');
    expect(normalizeTransactionStatus('00', '')).toBe('00');
  });
  it('keeps an explicit transaction status', () => {
    expect(normalizeTransactionStatus('00', '02')).toBe('02');
  });
});
