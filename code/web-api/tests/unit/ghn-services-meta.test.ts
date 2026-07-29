import { describe, it, expect } from 'vitest';
import { serviceMeta, serviceSortWeight, leadtimeDays } from '@/modules/shipping-provider/ghn/ghn.services-meta';

describe('serviceMeta (M-22)', () => {
  it('gán tên tiếng Việt theo service_type_id', () => {
    expect(serviceMeta(1).name).toBe('Giao nhanh');
    expect(serviceMeta(2).name).toBe('Giao tiêu chuẩn');
  });
  it('loại lạ thì dùng short_name của GHN, không hiện undefined', () => {
    const m = serviceMeta(99, 'Siêu tốc');
    expect(m.name).toBe('Siêu tốc');
    expect(m.name).not.toContain('undefined');
  });
  it('loại lạ và không có short_name vẫn có tên mặc định', () => {
    expect(serviceMeta(99, null).name).toBe('Giao hàng');
    expect(serviceMeta(99, '').name).toBe('Giao hàng');
  });
});

describe('serviceSortWeight', () => {
  it('nhanh xếp trước chuẩn', () => {
    expect(serviceSortWeight(1)).toBeLessThan(serviceSortWeight(2));
  });
  it('loại không rõ xếp cuối', () => {
    expect(serviceSortWeight(99)).toBeGreaterThan(serviceSortWeight(2));
  });
});

describe('leadtimeDays', () => {
  it('quy ra số ngày, làm tròn lên', () => {
    const order = 1_700_000_000;
    expect(leadtimeDays(order + 2 * 86400, order)).toBe(2);
    expect(leadtimeDays(order + 86400 + 3600, order)).toBe(2); // 1 ngày 1 giờ -> 2
  });
  it('leadtime không hợp lệ hoặc <= order_date trả null', () => {
    const order = 1_700_000_000;
    expect(leadtimeDays(order, order)).toBeNull();
    expect(leadtimeDays(NaN, order)).toBeNull();
  });
});
