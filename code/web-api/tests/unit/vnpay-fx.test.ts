import { describe, it, expect } from 'vitest';
import {
  convertUsdToVnd, toVnpAmount, assertUsableRate, assertPayableVnd, formatVnd,
  FxConfigurationError, VND_ROUNDING_UNIT,
} from '@/modules/payment-provider/vnpay/vnpay.fx';

const RATE = 26000;

describe('assertUsableRate (M-12 FX)', () => {
  it('rejects the old default of 1 — the bug that sent $350 as 350đ', () => {
    expect(() => assertUsableRate(1)).toThrow(FxConfigurationError);
  });
  it('rejects an unset / NaN rate', () => {
    expect(() => assertUsableRate(Number(undefined))).toThrow(FxConfigurationError);
    expect(() => assertUsableRate(0)).toThrow(FxConfigurationError);
  });
  it('accepts a plausible USD/VND rate', () => {
    expect(assertUsableRate(RATE)).toBe(RATE);
  });
});

describe('convertUsdToVnd', () => {
  it('converts $50 at 26.000 to 1.300.000đ', () => {
    expect(convertUsdToVnd(50, RATE)).toBe(1_300_000);
  });
  it('converts the reported $350 order to 9.100.000đ (not 350đ)', () => {
    expect(convertUsdToVnd(350, RATE)).toBe(9_100_000);
  });
  it('rounds UP to the nearest 1.000đ so the shop never under-charges', () => {
    // 50.55 * 26000 = 1.314.300 -> 1.315.000
    expect(convertUsdToVnd(50.55, RATE)).toBe(1_315_000);
    expect(convertUsdToVnd(50.55, RATE) % VND_ROUNDING_UNIT).toBe(0);
  });
  it('accepts a decimal string total from the database', () => {
    expect(convertUsdToVnd('12.00', RATE)).toBe(312_000);
  });
  it('refuses to convert with a broken rate', () => {
    expect(() => convertUsdToVnd(50, 1)).toThrow(FxConfigurationError);
  });
  it('refuses a negative amount', () => {
    expect(() => convertUsdToVnd(-5, RATE)).toThrow(FxConfigurationError);
  });
});

describe('toVnpAmount', () => {
  it('multiplies VND by 100', () => {
    expect(toVnpAmount(1_300_000)).toBe(130_000_000);
  });
  it('never emits decimals', () => {
    expect(Number.isInteger(toVnpAmount(1_300_000.4))).toBe(true);
  });
});

describe('assertPayableVnd', () => {
  it('rejects amounts under VNPay minimum', () => {
    expect(() => assertPayableVnd(4000)).toThrow(FxConfigurationError);
  });
  it('accepts a normal order', () => {
    expect(assertPayableVnd(1_300_000)).toBe(1_300_000);
  });
});

describe('formatVnd', () => {
  it('formats for Vietnamese buyers', () => {
    expect(formatVnd(1_300_000).replace(/ /g, ' ')).toBe('1.300.000 ₫');
  });
});
