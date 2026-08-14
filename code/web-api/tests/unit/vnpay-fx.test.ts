import { describe, it, expect } from 'vitest';
import {
  normalizeVnd, toVnpAmount, assertPayableVnd, formatVnd,
  FxConfigurationError, VND_ROUNDING_UNIT,
} from '@/modules/payment-provider/vnpay/vnpay.fx';

describe('normalizeVnd (M-15: cửa hàng niêm yết thẳng VND)', () => {
  it('giữ nguyên số tiền đã chẵn', () => {
    expect(normalizeVnd(1_300_000)).toBe(1_300_000);
  });
  it('làm tròn về đồng chẵn 1.000', () => {
    expect(normalizeVnd(1_300_400)).toBe(1_300_000);
    expect(normalizeVnd(1_300_600) % VND_ROUNDING_UNIT).toBe(0);
  });
  it('nhận chuỗi thập phân từ cơ sở dữ liệu', () => {
    expect(normalizeVnd('1300000.00')).toBe(1_300_000);
  });
  it('từ chối số tiền âm', () => {
    expect(() => normalizeVnd(-1)).toThrow(FxConfigurationError);
  });
});

describe('toVnpAmount', () => {
  it('nhân 100 theo yêu cầu VNPay', () => {
    expect(toVnpAmount(1_300_000)).toBe(130_000_000);
  });
  it('không bao giờ sinh số thập phân', () => {
    expect(Number.isInteger(toVnpAmount(1_300_000.4))).toBe(true);
  });
});

describe('assertPayableVnd', () => {
  it('chặn giao dịch dưới mức tối thiểu của VNPay', () => {
    expect(() => assertPayableVnd(4000)).toThrow(FxConfigurationError);
  });
  it('cho qua đơn bình thường', () => {
    expect(assertPayableVnd(1_300_000)).toBe(1_300_000);
  });
});

describe('formatVnd', () => {
  it('định dạng cho khách Việt Nam', () => {
    expect(formatVnd(1_300_000).replace(/ /g, ' ')).toBe('1.300.000 ₫');
  });
});
