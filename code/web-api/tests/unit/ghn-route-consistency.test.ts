import { describe, it, expect } from 'vitest';
import { buildFeeRequestBody } from '@/modules/shipping-provider/ghn/ghn.provider';

/**
 * Hồi quy cho lỗi thật: GHN trả "route not found service".
 *
 * Nguyên nhân: tra `available-services` theo tuyến A→B nhưng gọi `fee` không
 * kèm điểm đi, nên GHN dùng kho mặc định C → tuyến C→B. `service_id` lấy được
 * ở tuyến A→B không tồn tại trên tuyến C→B.
 *
 * Bất biến phải giữ: khi đã gửi `service_id`, payload BẮT BUỘC nói rõ điểm đi.
 */
describe('Tính nhất quán tuyến đường (M-13, hồi quy "route not found service")', () => {
  const parcel = { to_district_id: 1442, to_ward_code: '21012', weight: 500, length: 15, width: 15, height: 15 };

  it('gửi service_id thì payload phải kèm from_district_id', () => {
    const body = buildFeeRequestBody(
      { ...parcel, service_id: 53320, from_district_id: 1454 },
      { serviceTypeId: 2 },
    );
    expect(body.service_id).toBe(53320);
    expect(body.from_district_id).toBe(1454);
  });

  it('điểm đi mặc định được điền khi request không nói — hai lời gọi cùng tuyến', () => {
    const pickup = { fromDistrictId: 1454, fromWardCode: '21211', serviceTypeId: 2 };
    const body = buildFeeRequestBody({ ...parcel, service_id: 53320 }, pickup);
    expect(body.from_district_id).toBe(1454);
    expect(body.from_ward_code).toBe('21211');
  });

  it('KHÔNG có điểm đi ở cả request lẫn cấu hình => payload thiếu from_district_id', () => {
    // Đây chính là trạng thái gây lỗi. Test này ghi lại rằng payload sẽ để GHN
    // tự chọn kho — nên tầng trên (GhnService.resolvePickup) phải bảo đảm luôn
    // có điểm đi TRƯỚC khi gọi, thay vì trông chờ vào mặc định của GHN.
    const body = buildFeeRequestBody({ ...parcel, service_id: 53320 }, { serviceTypeId: 2 });
    expect(body.from_district_id).toBeUndefined();
  });

  it('điểm đi trong request luôn thắng cấu hình', () => {
    const body = buildFeeRequestBody(
      { ...parcel, from_district_id: 1443, from_ward_code: '21112' },
      { fromDistrictId: 1454, fromWardCode: '21211', serviceTypeId: 2 },
    );
    expect(body.from_district_id).toBe(1443);
    expect(body.from_ward_code).toBe('21112');
  });
});
