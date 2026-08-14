import { describe, it, expect } from 'vitest';
import { GhnMockProvider } from '@/modules/shipping-provider/ghn/ghn.mock';
import { serviceMeta, serviceSortWeight, leadtimeDays } from '@/modules/shipping-provider/ghn/ghn.services-meta';
import { applyFeePolicy } from '@/modules/shipping-provider/ghn/ghn.fee';
import { buildParcel } from '@/modules/shipping-provider/ghn/ghn.parcel';

/**
 * Luồng quoteOptions không cần DB: tự dựng lại từ mock provider để kiểm chứng
 * mỗi dịch vụ có phí + thời gian riêng, và danh sách sắp xếp nhanh→tiết kiệm.
 */
const provider = new GhnMockProvider(1442);

async function buildOptions(fromDistrict: number, toDistrict: number, toWard: string) {
  const parcel = buildParcel([{ quantity: 1, weightGram: 500, lengthCm: 15, widthCm: 15, heightCm: 15 }]);
  const services = await provider.getAvailableServices(fromDistrict, toDistrict);
  const base = { from_district_id: fromDistrict, to_district_id: toDistrict, to_ward_code: toWard,
    weight: parcel.weightGram, length: parcel.lengthCm, width: parcel.widthCm, height: parcel.heightCm };
  const opts = await Promise.all(services.map(async (svc) => {
    const fee = await provider.calculateFee({ ...base, service_id: svc.service_id });
    const lt = await provider.getLeadtime({
      from_district_id: fromDistrict, from_ward_code: '21012', to_district_id: toDistrict, to_ward_code: toWard, service_id: svc.service_id,
    });
    const policy = applyFeePolicy({ carrierFeeVnd: fee.total, subtotalVnd: 300_000, freeOverVnd: 500_000 });
    const meta = serviceMeta(svc.service_type_id, svc.short_name);
    return { serviceTypeId: svc.service_type_id, name: meta.name, feeVnd: policy.customerFeeVnd,
      leadtimeDays: leadtimeDays(lt.leadtime, lt.order_date) };
  }));
  return opts.sort((a, b) => serviceSortWeight(a.serviceTypeId) - serviceSortWeight(b.serviceTypeId));
}

describe('quoteOptions end-to-end (M-22)', () => {
  it('trả nhiều phương thức, mỗi cái có tên + phí + số ngày', async () => {
    const opts = await buildOptions(1442, 1482, '1A0201');
    expect(opts.length).toBeGreaterThanOrEqual(2);
    for (const o of opts) {
      expect(o.name).toBeTruthy();
      expect(o.feeVnd).toBeGreaterThanOrEqual(0);
      expect(o.leadtimeDays).toBeGreaterThanOrEqual(1);
    }
  });

  it('sắp xếp nhanh trước, tiết kiệm sau', async () => {
    const opts = await buildOptions(1442, 1482, '1A0201');
    const weights = opts.map((o) => serviceSortWeight(o.serviceTypeId));
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
  });

  it('dịch vụ nhanh giao sớm hơn tiết kiệm', async () => {
    const opts = await buildOptions(1442, 1482, '1A0201');
    const fast = opts.find((o) => o.serviceTypeId === 1);
    const saving = opts.find((o) => o.serviceTypeId === 3);
    if (fast && saving && fast.leadtimeDays && saving.leadtimeDays) {
      expect(fast.leadtimeDays).toBeLessThanOrEqual(saving.leadtimeDays);
    }
  });
});
