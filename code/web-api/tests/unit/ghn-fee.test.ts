import { describe, it, expect } from 'vitest';
import {
  applyFeePolicy, quoteBlockedReason, districtSupportsDelivery, FEE_ROUNDING_UNIT,
} from '@/modules/shipping-provider/ghn/ghn.fee';

describe('applyFeePolicy (M-13b)', () => {
  it('khách trả đúng cước GHN khi không có chính sách nào', () => {
    const r = applyFeePolicy({ carrierFeeVnd: 36_000, subtotalVnd: 500_000 });
    expect(r.customerFeeVnd).toBe(36_000);
    expect(r.shopBearsVnd).toBe(0);
    expect(r.freeShipping).toBe(false);
  });

  it('miễn phí ship khi đạt ngưỡng — cửa hàng gánh toàn bộ cước', () => {
    const r = applyFeePolicy({ carrierFeeVnd: 36_000, subtotalVnd: 1_000_000, freeOverVnd: 500_000 });
    expect(r.customerFeeVnd).toBe(0);
    expect(r.freeShipping).toBe(true);
    expect(r.shopBearsVnd).toBe(36_000);
  });

  it('chưa đạt ngưỡng thì vẫn thu phí', () => {
    const r = applyFeePolicy({ carrierFeeVnd: 36_000, subtotalVnd: 499_000, freeOverVnd: 500_000 });
    expect(r.freeShipping).toBe(false);
    expect(r.customerFeeVnd).toBeGreaterThan(0);
  });

  it('trợ giá trừ vào phần khách trả, không âm', () => {
    expect(applyFeePolicy({ carrierFeeVnd: 36_000, subtotalVnd: 100_000, subsidyVnd: 10_000 }).customerFeeVnd).toBe(26_000);
    expect(applyFeePolicy({ carrierFeeVnd: 20_000, subtotalVnd: 100_000, subsidyVnd: 50_000 }).customerFeeVnd).toBe(0);
  });

  it('làm tròn xuống đồng chẵn, phần lẻ cửa hàng chịu', () => {
    const r = applyFeePolicy({ carrierFeeVnd: 36_500, subtotalVnd: 100_000 });
    expect(r.customerFeeVnd % FEE_ROUNDING_UNIT).toBe(0);
    expect(r.customerFeeVnd).toBe(36_000);
    expect(r.shopBearsVnd).toBe(500);
  });

  it('ngưỡng miễn phí bằng 0 hoặc null thì không kích hoạt', () => {
    expect(applyFeePolicy({ carrierFeeVnd: 30_000, subtotalVnd: 0, freeOverVnd: 0 }).freeShipping).toBe(false);
    expect(applyFeePolicy({ carrierFeeVnd: 30_000, subtotalVnd: 9e9, freeOverVnd: null }).freeShipping).toBe(false);
  });
});

describe('quoteBlockedReason', () => {
  const base = { districtId: 1442, wardCode: '21012', districtSupportsDelivery: true, parcelExceedsLimit: false };

  it('cho phép báo giá khi đủ điều kiện', () => {
    expect(quoteBlockedReason(base)).toBeNull();
  });
  it('chặn khi khách chưa chọn đủ quận/phường', () => {
    expect(quoteBlockedReason({ ...base, wardCode: null })).toBe('missing_destination');
    expect(quoteBlockedReason({ ...base, districtId: null })).toBe('missing_destination');
  });
  it('chặn khi GHN không giao tới quận đó', () => {
    expect(quoteBlockedReason({ ...base, districtSupportsDelivery: false })).toBe('district_not_served');
  });
  it('chặn khi kiện quá nặng', () => {
    expect(quoteBlockedReason({ ...base, parcelExceedsLimit: true })).toBe('parcel_too_heavy');
  });
});

describe('districtSupportsDelivery', () => {
  it('chỉ SupportType 2 và 3 mới giao được', () => {
    expect(districtSupportsDelivery(0)).toBe(false); // khoá
    expect(districtSupportsDelivery(1)).toBe(false); // chỉ lấy hàng/thu hộ
    expect(districtSupportsDelivery(2)).toBe(true);
    expect(districtSupportsDelivery(3)).toBe(true);
    expect(districtSupportsDelivery(null)).toBe(false);
  });
});
