import { describe, it, expect } from 'vitest';
import { buildFeeRequestBody, warnIfSuspiciousBaseUrl, GHN_DEV_BASE_URL, GHN_PROD_BASE_URL } from '@/modules/shipping-provider/ghn/ghn.provider';

const parcel = { to_district_id: 1442, to_ward_code: '21012', weight: 500, length: 10, width: 10, height: 10 };
const defaults = { fromDistrictId: 1454, fromWardCode: '21211', serviceTypeId: 2 };

describe('buildFeeRequestBody (M-13, lỗi thứ tự spread)', () => {
  it('điền service_type_id mặc định khi request không nói gì', () => {
    expect(buildFeeRequestBody(parcel, defaults).service_type_id).toBe(2);
  });

  it('service_type_id: undefined trong request KHÔNG được ghi đè mặc định', () => {
    // Đây chính là lỗi cũ: `...request` đặt sau khiến undefined thắng.
    const body = buildFeeRequestBody({ ...parcel, service_type_id: undefined }, defaults);
    expect(body.service_type_id).toBe(2);
  });

  it('có service_id thì bỏ service_type_id — GHN không nhận cả hai', () => {
    const body = buildFeeRequestBody({ ...parcel, service_id: 53320 }, defaults);
    expect(body.service_id).toBe(53320);
    expect('service_type_id' in body).toBe(false);
  });

  it('không có service_id thì trường service_id bị loại khỏi payload', () => {
    const body = buildFeeRequestBody({ ...parcel, service_id: undefined }, defaults);
    expect('service_id' in body).toBe(false);
    expect(body.service_type_id).toBe(2);
  });

  it('điền điểm lấy hàng mặc định', () => {
    const body = buildFeeRequestBody(parcel, defaults);
    expect(body.from_district_id).toBe(1454);
    expect(body.from_ward_code).toBe('21211');
  });

  it('điểm lấy hàng trong request được ưu tiên', () => {
    const body = buildFeeRequestBody({ ...parcel, from_district_id: 1443 }, defaults);
    expect(body.from_district_id).toBe(1443);
  });

  it('không cấu hình kho thì bỏ trống để GHN tự dùng kho của ShopId', () => {
    const body = buildFeeRequestBody(parcel, { serviceTypeId: 2 });
    expect(body.from_district_id).toBeUndefined();
    expect(body.from_ward_code).toBeUndefined();
  });

  it('giữ nguyên thông số kiện hàng', () => {
    const body = buildFeeRequestBody(parcel, defaults);
    expect(body).toMatchObject({ to_district_id: 1442, to_ward_code: '21012', weight: 500 });
  });
});

describe('warnIfSuspiciousBaseUrl', () => {
  it('nhắc dev URL là STAGING, cần token staging — không khẳng định sống/chết', () => {
    const hint = warnIfSuspiciousBaseUrl(GHN_DEV_BASE_URL);
    expect(hint).toContain('staging');
    expect(hint).not.toContain('ngừng'); // không võ đoán gateway đã chết
  });
  it('URL production là bình thường, không cảnh báo', () => {
    expect(warnIfSuspiciousBaseUrl(GHN_PROD_BASE_URL)).toBeNull();
  });
  it('cảnh báo khi URL không thuộc tên miền ghn.vn', () => {
    expect(warnIfSuspiciousBaseUrl('https://example.com')).toContain('không phải tên miền');
  });
});
