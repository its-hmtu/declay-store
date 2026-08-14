import { describe, it, expect } from 'vitest';
import { GhnMockProvider } from '@/modules/shipping-provider/ghn/ghn.mock';
import { buildParcel } from '@/modules/shipping-provider/ghn/ghn.parcel';
import { applyFeePolicy } from '@/modules/shipping-provider/ghn/ghn.fee';

const provider = new GhnMockProvider(1442); // kho ở Quận 1, TP.HCM

describe('GhnMockProvider — dữ liệu địa giới', () => {
  it('trả về tỉnh/thành', async () => {
    const provinces = await provider.getProvinces();
    expect(provinces.map((p) => p.ProvinceName)).toContain('Hồ Chí Minh');
  });

  it('lọc quận theo tỉnh', async () => {
    const districts = await provider.getDistricts(202);
    expect(districts.every((d) => d.ProvinceID === 202)).toBe(true);
    expect(districts.some((d) => d.DistrictID === 1442)).toBe(true);
  });

  it('có sẵn một quận KHÔNG giao được để test nhánh từ chối', async () => {
    const districts = await provider.getDistricts(203);
    expect(districts.some((d) => d.SupportType === 0)).toBe(true);
  });

  it('lọc phường theo quận', async () => {
    const wards = await provider.getWards(1442);
    expect(wards.length).toBeGreaterThan(0);
    expect(wards.every((w) => w.DistrictID === 1442)).toBe(true);
  });
});

describe('GhnMockProvider — biểu phí', () => {
  it('nội tỉnh rẻ hơn liên miền', async () => {
    const parcel = buildParcel([{ quantity: 1, weightGram: 400, lengthCm: 10, widthCm: 10, heightCm: 10 }]);
    const base = { weight: parcel.weightGram, length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm, to_ward_code: '21012' };

    const noiTinh = await provider.calculateFee({ ...base, to_district_id: 1443 });      // HCM -> HCM
    const lienMien = await provider.calculateFee({ ...base, to_district_id: 1482 });     // HCM -> Hà Nội
    expect(noiTinh.total).toBeLessThan(lienMien.total);
  });

  it('cộng phụ phí theo mỗi 500g vượt mức', async () => {
    const light = await provider.calculateFee({ to_district_id: 1443, to_ward_code: '21112', weight: 400, length: 10, width: 10, height: 10 });
    const heavy = await provider.calculateFee({ to_district_id: 1443, to_ward_code: '21112', weight: 1400, length: 10, width: 10, height: 10 });
    expect(heavy.total).toBeGreaterThan(light.total);
  });

  it('từ chối kiện vượt 30kg', async () => {
    await expect(
      provider.calculateFee({ to_district_id: 1443, to_ward_code: '21112', weight: 31_000, length: 10, width: 10, height: 10 }),
    ).rejects.toThrow();
  });
});

describe('Luồng đầu-cuối: giỏ hàng -> kiện -> cước -> phí khách trả', () => {
  it('đơn nhỏ: khách trả cước GHN', async () => {
    const parcel = buildParcel([{ quantity: 2, weightGram: 300, lengthCm: 12, widthCm: 12, heightCm: 8 }]);
    const fee = await provider.calculateFee({
      to_district_id: 1452, to_ward_code: '21211',
      weight: parcel.weightGram, length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm,
    });
    const policy = applyFeePolicy({ carrierFeeVnd: fee.total, subtotalVnd: 300_000, freeOverVnd: 500_000 });

    expect(policy.freeShipping).toBe(false);
    expect(policy.customerFeeVnd).toBeGreaterThan(0);
    expect(policy.customerFeeVnd % 1000).toBe(0);
  });

  it('đơn lớn: miễn phí ship, cửa hàng gánh cước', async () => {
    const parcel = buildParcel([{ quantity: 1, weightGram: 800, lengthCm: 20, widthCm: 20, heightCm: 15 }]);
    const fee = await provider.calculateFee({
      to_district_id: 1482, to_ward_code: '1A0201',
      weight: parcel.weightGram, length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm,
    });
    const policy = applyFeePolicy({ carrierFeeVnd: fee.total, subtotalVnd: 1_200_000, freeOverVnd: 500_000 });

    expect(policy.customerFeeVnd).toBe(0);
    expect(policy.shopBearsVnd).toBe(fee.total);
  });
});
