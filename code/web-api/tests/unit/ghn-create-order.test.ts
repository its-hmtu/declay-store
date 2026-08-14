import { describe, it, expect } from 'vitest';
import {
  buildCreateOrderPayload, GhnOrderError, PAYMENT_TYPE_SHOP,
  GHN_MAX_COD_VND, GHN_MAX_INSURANCE_VND, GHN_MAX_WEIGHT_GRAM_CREATE,
} from '@/modules/shipping-provider/ghn/ghn.order';

const base = {
  orderCode: 'DC-260726-AB2C',
  isPrepaid: false,
  totalAmountVnd: 1_300_000,
  goodsValueVnd: 1_200_000,
  receiver: { name: 'Nguyễn Văn A', phone: '0987654321', address: '72 Thành Thái', wardCode: '21012', districtId: 1442 },
  parcel: { weightGram: 800, lengthCm: 20, widthCm: 15, heightCm: 10 },
  items: [{ name: 'Tượng gốm mèo', code: 'SKU1', quantity: 2, priceVnd: 600_000, weightGram: 400 }],
};

describe('LUẬT TIỀN: cod_amount (M-13d)', () => {
  it('đơn COD thu đúng tổng tiền đơn hàng', () => {
    expect(buildCreateOrderPayload(base).cod_amount).toBe(1_300_000);
  });

  it('đơn ĐÃ TRẢ TRƯỚC phải thu hộ 0 — nếu không là thu tiền khách hai lần', () => {
    expect(buildCreateOrderPayload({ ...base, isPrepaid: true }).cod_amount).toBe(0);
  });

  it('chặn đơn vượt hạn mức thu hộ của GHN', () => {
    expect(() => buildCreateOrderPayload({ ...base, totalAmountVnd: GHN_MAX_COD_VND + 1 }))
      .toThrow(GhnOrderError);
  });
});

describe('LUẬT TIỀN: ai trả cước', () => {
  it('cửa hàng trả cước cho GHN vì khách đã trả phí ship khi đặt', () => {
    expect(buildCreateOrderPayload(base).payment_type_id).toBe(PAYMENT_TYPE_SHOP);
  });
});

describe('Chống tạo vận đơn trùng', () => {
  it('client_order_code chính là mã đơn hàng — GHN trả lại vận đơn cũ khi gọi lại', () => {
    expect(buildCreateOrderPayload(base).client_order_code).toBe('DC-260726-AB2C');
  });

  it('thiếu mã đơn thì từ chối, vì mất khoá chống trùng', () => {
    expect(() => buildCreateOrderPayload({ ...base, orderCode: '' })).toThrow(GhnOrderError);
  });
});

describe('Bảo hiểm hàng hoá', () => {
  it('khai giá theo giá trị hàng', () => {
    expect(buildCreateOrderPayload(base).insurance_value).toBe(1_200_000);
  });
  it('cắt trần theo quy định GHN thay vì để GHN từ chối đơn', () => {
    const p = buildCreateOrderPayload({ ...base, goodsValueVnd: 9_000_000 });
    expect(p.insurance_value).toBe(GHN_MAX_INSURANCE_VND);
  });
});

describe('Giới hạn kiện hàng', () => {
  it('chặn kiện vượt 50kg', () => {
    expect(() => buildCreateOrderPayload({
      ...base, parcel: { ...base.parcel, weightGram: GHN_MAX_WEIGHT_GRAM_CREATE + 1 },
    })).toThrow(GhnOrderError);
  });

  it('chặn kích thước vượt 200cm, báo rõ chiều nào', () => {
    expect(() => buildCreateOrderPayload({ ...base, parcel: { ...base.parcel, lengthCm: 250 } }))
      .toThrow(/Chiều dài/);
  });

  it('làm tròn lên số nguyên vì GHN chỉ nhận Int', () => {
    const p = buildCreateOrderPayload({ ...base, parcel: { weightGram: 800.4, lengthCm: 20.2, widthCm: 15.9, heightCm: 10.1 } });
    for (const v of [p.weight, p.length, p.width, p.height]) expect(Number.isInteger(v)).toBe(true);
  });
});

describe('Địa chỉ và sản phẩm', () => {
  it('thiếu mã phường/quận thì từ chối, không đoán', () => {
    expect(() => buildCreateOrderPayload({ ...base, receiver: { ...base.receiver, wardCode: '' } }))
      .toThrow(GhnOrderError);
  });

  it('đơn rỗng bị từ chối', () => {
    expect(() => buildCreateOrderPayload({ ...base, items: [] })).toThrow(GhnOrderError);
  });

  it('ward_code luôn là chuỗi', () => {
    const p = buildCreateOrderPayload({ ...base, receiver: { ...base.receiver, wardCode: 21012 as unknown as string } });
    expect(typeof p.to_ward_code).toBe('string');
  });

  it('content tóm tắt tên và số lượng sản phẩm', () => {
    expect(buildCreateOrderPayload(base).content).toBe('Tượng gốm mèo x2');
  });
});

describe('Dịch vụ và ghi chú', () => {
  it('có service_id thì không gửi service_type_id', () => {
    const p = buildCreateOrderPayload({ ...base, serviceId: 53320 });
    expect(p.service_id).toBe(53320);
    expect('service_type_id' in p).toBe(false);
  });

  it('không có service_id thì dùng service_type_id', () => {
    const p = buildCreateOrderPayload({ ...base, serviceTypeId: 5 });
    expect(p.service_type_id).toBe(5);
    expect('service_id' in p).toBe(false);
  });

  it('mặc định cho khách xem hàng nhưng không cho thử', () => {
    expect(buildCreateOrderPayload(base).required_note).toBe('CHOXEMHANGKHONGTHU');
  });
});
