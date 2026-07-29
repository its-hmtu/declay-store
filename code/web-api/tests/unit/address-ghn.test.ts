import { describe, it, expect } from 'vitest';
import { ghnDestinationFromAddress, addressIsShippable } from '@/modules/address/address.ghn';

describe('ghnDestinationFromAddress (M-13 xung đột sổ địa chỉ)', () => {
  it('địa chỉ có đủ mã GHN → giao được', () => {
    expect(ghnDestinationFromAddress({ ghnDistrictId: 1442, ghnWardCode: '21012' }))
      .toEqual({ districtId: 1442, wardCode: '21012' });
  });

  it('địa chỉ CŨ thiếu mã GHN → null (đây chính là lỗi đã gặp)', () => {
    expect(ghnDestinationFromAddress({ ghnDistrictId: null, ghnWardCode: null })).toBeNull();
    expect(ghnDestinationFromAddress({})).toBeNull();
  });

  it('thiếu một trong hai mã cũng coi là chưa đủ', () => {
    expect(ghnDestinationFromAddress({ ghnDistrictId: 1442, ghnWardCode: null })).toBeNull();
    expect(ghnDestinationFromAddress({ ghnDistrictId: null, ghnWardCode: '21012' })).toBeNull();
  });

  it('ward_code luôn ép về chuỗi (GHN trả có thể là số)', () => {
    const dest = ghnDestinationFromAddress({ ghnDistrictId: 1442, ghnWardCode: 21012 as unknown as string });
    expect(dest?.wardCode).toBe('21012');
    expect(typeof dest?.wardCode).toBe('string');
  });

  it('null/undefined không ném lỗi', () => {
    expect(ghnDestinationFromAddress(null)).toBeNull();
    expect(ghnDestinationFromAddress(undefined)).toBeNull();
  });
});

describe('addressIsShippable', () => {
  it('quyết định bật/tắt nút thanh toán', () => {
    expect(addressIsShippable({ ghnDistrictId: 1442, ghnWardCode: '21012' })).toBe(true);
    expect(addressIsShippable({ ghnDistrictId: null, ghnWardCode: null })).toBe(false);
  });
});
