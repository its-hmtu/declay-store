import { describe, it, expect } from 'vitest';
import {
  generateOrderCode, isValidOrderCode, normalizeOrderCode, orderDatePart, CODE_ALPHABET,
} from '@/modules/order/order.code';

describe('generateOrderCode (M-16)', () => {
  it('đúng định dạng DC-YYMMDD-XXXX', () => {
    expect(isValidOrderCode(generateOrderCode())).toBe(true);
  });

  it('phần ngày theo giờ Việt Nam, không theo UTC', () => {
    // 2026-07-26T18:00:00Z = 01:00 ngày 27/07 ở Việt Nam (UTC+7)
    const code = generateOrderCode(new Date('2026-07-26T18:00:00Z'), () => 0);
    expect(code).toContain('-260727-');
  });

  it('không chứa ký tự dễ đọc nhầm (I, L, O, U, 0, 1)', () => {
    for (const bad of ['I', 'L', 'O', 'U']) {
      expect(CODE_ALPHABET).not.toContain(bad);
    }
    const suffix = generateOrderCode(new Date(), () => 0.999).split('-')[2];
    expect(suffix).not.toMatch(/[ILOU01]/);
  });

  it('tất định khi truyền hàm random cố định', () => {
    const at = new Date('2026-07-26T03:00:00Z');
    expect(generateOrderCode(at, () => 0)).toBe(generateOrderCode(at, () => 0));
  });

  it('sinh mã khác nhau qua nhiều lần gọi', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOrderCode()));
    expect(codes.size).toBeGreaterThan(150);
  });
});

describe('isValidOrderCode', () => {
  it('từ chối mã sai định dạng', () => {
    expect(isValidOrderCode('42')).toBe(false);
    expect(isValidOrderCode('DC-2607-AB')).toBe(false);
    expect(isValidOrderCode('XX-260726-ABCD')).toBe(false);
    expect(isValidOrderCode('DC-260726-ABC0')).toBe(false); // chứa số 0
  });
});

describe('normalizeOrderCode', () => {
  it('khách gõ liền không dấu gạch vẫn tra được', () => {
    expect(normalizeOrderCode('dc260726ab2c')).toBe('DC-260726-AB2C');
  });
  it('bỏ khoảng trắng thừa', () => {
    expect(normalizeOrderCode(' DC-260726-AB2C ')).toBe('DC-260726-AB2C');
  });
  it('giữ nguyên mã đã đúng định dạng', () => {
    expect(normalizeOrderCode('DC-260726-AB2C')).toBe('DC-260726-AB2C');
  });
  it('chuỗi rác trả về dạng đã làm sạch, không ném lỗi', () => {
    expect(normalizeOrderCode('???')).toBe('');
  });
});

describe('orderDatePart', () => {
  it('luôn 6 chữ số', () => {
    expect(orderDatePart(new Date('2026-01-05T00:00:00Z'))).toMatch(/^\d{6}$/);
  });
});
