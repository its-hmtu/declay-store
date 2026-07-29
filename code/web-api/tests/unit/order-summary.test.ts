import { describe, it, expect } from 'vitest';
import { maskEmail, formatAddressLine, countItems } from '@/modules/order/order.summary';

describe('maskEmail (M-19)', () => {
  it('che phần giữa, giữ đủ để khách nhận ra email của mình', () => {
    expect(maskEmail('nguyenvana@gmail.com')).toBe('ng******na@gmail.com');
  });

  it('giữ nguyên tên miền để khách biết đúng nhà cung cấp', () => {
    expect(maskEmail('someone@yahoo.com')).toContain('@yahoo.com');
  });

  it('email ngắn vẫn che được, không lộ toàn bộ', () => {
    expect(maskEmail('ab@x.com')).toBe('a*@x.com');
    expect(maskEmail('abcd@x.com')).toBe('a***@x.com');
  });

  it('không bao giờ trả về email đầy đủ', () => {
    for (const e of ['a@b.co', 'test@declay.vn', 'rat.dai.dong.a@company.com.vn']) {
      expect(maskEmail(e)).not.toBe(e);
      expect(maskEmail(e)).toContain('*');
    }
  });

  it('giá trị rỗng hoặc sai định dạng trả null thay vì ném lỗi', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('')).toBeNull();
    expect(maskEmail('khong-co-a-cong')).toBeNull();
    expect(maskEmail('@nodomain.com')).toBeNull();
  });
});

describe('formatAddressLine', () => {
  it('ghép đủ các cấp địa giới', () => {
    expect(formatAddressLine({
      addressLine: '72 Thành Thái', ward: 'Phường 14', district: 'Quận 10', city: 'Hồ Chí Minh',
    })).toBe('72 Thành Thái, Phường 14, Quận 10, Hồ Chí Minh');
  });

  it('bỏ qua phần trống, không để lại dấu phẩy thừa', () => {
    expect(formatAddressLine({ addressLine: '72 Thành Thái', ward: null, district: '', city: 'HCM' }))
      .toBe('72 Thành Thái, HCM');
  });

  it('cắt khoảng trắng thừa', () => {
    expect(formatAddressLine({ addressLine: '  72 Thành Thái  ', city: ' HCM ' }))
      .toBe('72 Thành Thái, HCM');
  });

  it('không có gì thì trả chuỗi rỗng', () => {
    expect(formatAddressLine({})).toBe('');
  });
});

describe('countItems', () => {
  it('đếm theo SỐ LƯỢNG, không phải số dòng', () => {
    expect(countItems([{ quantity: 2 }, { quantity: 1 }])).toBe(3);
  });
  it('giỏ rỗng trả 0', () => {
    expect(countItems([])).toBe(0);
  });
});
