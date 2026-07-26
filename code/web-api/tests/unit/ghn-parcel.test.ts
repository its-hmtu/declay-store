import { describe, it, expect } from 'vitest';
import {
  buildParcel, volumetricWeightGram, DEFAULT_WEIGHT_GRAM, DEFAULT_DIMENSION_CM, GHN_MAX_WEIGHT_GRAM,
} from '@/modules/shipping-provider/ghn/ghn.parcel';

describe('volumetricWeightGram (M-13b)', () => {
  it('quy đổi thể tích theo hệ số 5000 của GHN', () => {
    // 20 x 20 x 50 = 20.000 cm3 / 5000 = 4kg
    expect(volumetricWeightGram(20, 20, 50)).toBe(4000);
  });
});

describe('buildParcel', () => {
  it('cộng dồn cân nặng theo số lượng', () => {
    const p = buildParcel([{ quantity: 3, weightGram: 200, lengthCm: 10, widthCm: 10, heightCm: 5 }]);
    expect(p.weightGram).toBe(600);
    expect(p.usedDefaults).toBe(false);
  });

  it('lấy trọng lượng quy đổi khi hàng nhẹ mà cồng kềnh', () => {
    // Món 100g nhưng hộp 40x40x40 -> quy đổi 12.8kg, phải tính theo quy đổi
    const p = buildParcel([{ quantity: 1, weightGram: 100, lengthCm: 40, widthCm: 40, heightCm: 40 }]);
    expect(p.weightGram).toBe(volumetricWeightGram(40, 40, 40));
    expect(p.weightGram).toBeGreaterThan(100);
  });

  it('dùng cân mặc định khi biến thể chưa khai báo, và báo lại là đã dùng mặc định', () => {
    const p = buildParcel([{ quantity: 2 }]);
    expect(p.weightGram).toBeGreaterThanOrEqual(DEFAULT_WEIGHT_GRAM * 2);
    expect(p.usedDefaults).toBe(true);
  });

  it('coi cân nặng 0 hoặc âm là chưa khai báo', () => {
    expect(buildParcel([{ quantity: 1, weightGram: 0 }]).usedDefaults).toBe(true);
    expect(buildParcel([{ quantity: 1, weightGram: -5 }]).usedDefaults).toBe(true);
  });

  it('xếp chồng chiều cao, giữ đáy lớn nhất', () => {
    const p = buildParcel([
      { quantity: 1, weightGram: 100, lengthCm: 30, widthCm: 20, heightCm: 10 },
      { quantity: 2, weightGram: 100, lengthCm: 10, widthCm: 10, heightCm: 5 },
    ]);
    expect(p.lengthCm).toBe(30);
    expect(p.widthCm).toBe(20);
    expect(p.heightCm).toBe(10 + 5 * 2);
  });

  it('đánh dấu kiện vượt giới hạn 30kg của GHN', () => {
    const p = buildParcel([{ quantity: 100, weightGram: 400, lengthCm: 5, widthCm: 5, heightCm: 5 }]);
    expect(p.weightGram).toBeGreaterThan(GHN_MAX_WEIGHT_GRAM);
    expect(p.exceedsLimit).toBe(true);
  });

  it('giỏ rỗng vẫn trả kiện hợp lệ thay vì ném lỗi', () => {
    const p = buildParcel([]);
    expect(p.weightGram).toBe(DEFAULT_WEIGHT_GRAM);
    expect(p.lengthCm).toBe(DEFAULT_DIMENSION_CM);
  });
});
