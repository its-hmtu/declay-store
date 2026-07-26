import { describe, it, expect } from 'vitest';
import {
  buildSignData, signParams, verifySignature, vnpDate, sanitizeOrderInfo, encodeValue,
} from '@/modules/payment-provider/vnpay/vnpay.signature';

const SECRET = 'TESTSECRET123';

describe('buildSignData (M-12)', () => {
  it('sorts keys alphabetically', () => {
    expect(buildSignData({ vnp_Version: '2.1.0', vnp_Amount: 1000, vnp_Command: 'pay' }))
      .toBe('vnp_Amount=1000&vnp_Command=pay&vnp_Version=2.1.0');
  });
  it('excludes the hash fields and empty values', () => {
    const data = buildSignData({
      vnp_Amount: 100, vnp_SecureHash: 'abc', vnp_SecureHashType: 'SHA512',
      vnp_BankCode: '', vnp_Locale: undefined, vnp_TxnRef: '1',
    });
    expect(data).toBe('vnp_Amount=100&vnp_TxnRef=1');
  });
  it('encodes spaces as + (VNPay querystring behaviour)', () => {
    expect(encodeValue('order 12 info')).toBe('order+12+info');
    expect(buildSignData({ vnp_OrderInfo: 'Thanh toan don 12' }))
      .toBe('vnp_OrderInfo=Thanh+toan+don+12');
  });
  it('percent-encodes URLs', () => {
    expect(buildSignData({ vnp_ReturnUrl: 'https://a.com/return?x=1' }))
      .toBe('vnp_ReturnUrl=https%3A%2F%2Fa.com%2Freturn%3Fx%3D1');
  });
});

describe('signParams / verifySignature', () => {
  const params = { vnp_Amount: 1000000, vnp_TxnRef: '42', vnp_Command: 'pay' };

  it('produces a stable lowercase hex HMAC-SHA512', () => {
    const sig = signParams(params, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{128}$/);
    expect(signParams(params, SECRET)).toBe(sig);
  });
  it('accepts its own signature', () => {
    expect(verifySignature(params, SECRET, signParams(params, SECRET))).toBe(true);
  });
  it('accepts an upper-case hash (VNPay sometimes returns upper case)', () => {
    expect(verifySignature(params, SECRET, signParams(params, SECRET).toUpperCase())).toBe(true);
  });
  it('rejects a tampered amount — the critical fraud check', () => {
    const sig = signParams(params, SECRET);
    expect(verifySignature({ ...params, vnp_Amount: 1 }, SECRET, sig)).toBe(false);
  });
  it('rejects a wrong secret and a missing hash', () => {
    expect(verifySignature(params, 'OTHER', signParams(params, SECRET))).toBe(false);
    expect(verifySignature(params, SECRET, undefined)).toBe(false);
  });
  it('ignores the hash fields when verifying a returned payload', () => {
    const sig = signParams(params, SECRET);
    expect(verifySignature({ ...params, vnp_SecureHash: sig, vnp_SecureHashType: 'SHA512' }, SECRET, sig)).toBe(true);
  });
});

describe('vnpDate', () => {
  it('formats as yyyyMMddHHmmss in Vietnam time', () => {
    // 2026-07-20T00:30:00Z = 07:30 in Asia/Ho_Chi_Minh (UTC+7)
    expect(vnpDate(new Date('2026-07-20T00:30:00Z'))).toBe('20260720073000');
  });
});

describe('sanitizeOrderInfo', () => {
  it('strips Vietnamese accents and special characters', () => {
    expect(sanitizeOrderInfo('Thanh toán đơn #12 (Declay)')).toBe('Thanh toan don 12 Declay');
  });
});
