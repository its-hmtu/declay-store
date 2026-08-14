/**
 * M-13b: gộp giỏ hàng thành một kiện hàng để hỏi phí GHN.
 *
 * GHN tính phí theo cân nặng (gram) VÀ kích thước — lấy cái nào lớn hơn giữa
 * cân thực và **trọng lượng quy đổi** (dài×rộng×cao / hệ số). Món đồ handmade
 * thường nhẹ nhưng cồng kềnh, nên bỏ qua quy đổi là báo phí thiếu, đến lúc
 * giao hàng cửa hàng phải bù chênh lệch.
 */

/** Hệ số quy đổi tiêu chuẩn của GHN cho hàng thường (cm³ / 5000 = kg). */
export const GHN_VOLUMETRIC_DIVISOR = 5000;

/**
 * Cân nặng mặc định khi biến thể chưa khai báo. Đặt CAO một cách có chủ ý:
 * báo dư phí thì cửa hàng chịu thiệt nhỏ, báo thiếu thì phải bù cho GHN và
 * giải thích với khách. Admin nên khai cân thật cho từng biến thể.
 */
export const DEFAULT_WEIGHT_GRAM = 500;

/** Kích thước mặc định (cm) khi biến thể chưa khai báo. */
export const DEFAULT_DIMENSION_CM = 15;

/** GHN từ chối kiện quá 30kg ở dịch vụ tiêu chuẩn. */
export const GHN_MAX_WEIGHT_GRAM = 30_000;

export interface ParcelItemInput {
  quantity: number;
  weightGram?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface Parcel {
  /** Cân tính phí = max(cân thực, trọng lượng quy đổi) */
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** True khi có ít nhất một món thiếu thông số — dùng để cảnh báo admin. */
  usedDefaults: boolean;
  /** True khi vượt giới hạn của GHN, phải tách kiện hoặc đổi dịch vụ. */
  exceedsLimit: boolean;
}

function positive(value: number | null | undefined, fallback: number): { value: number; usedDefault: boolean } {
  return Number.isFinite(Number(value)) && Number(value) > 0
    ? { value: Math.ceil(Number(value)), usedDefault: false }
    : { value: fallback, usedDefault: true };
}

/** Trọng lượng quy đổi từ thể tích, theo gram. */
export function volumetricWeightGram(lengthCm: number, widthCm: number, heightCm: number): number {
  return Math.ceil(((lengthCm * widthCm * heightCm) / GHN_VOLUMETRIC_DIVISOR) * 1000);
}

/**
 * Gộp nhiều dòng hàng thành một kiện.
 *
 * Quy ước đơn giản hoá có chủ ý: xếp chồng theo CHIỀU CAO, giữ nguyên đáy lớn
 * nhất. Không mô phỏng xếp hàng 3 chiều — sai số nhỏ và luôn nghiêng về phía
 * báo dư, phù hợp với đơn hàng vài món của cửa hàng thủ công.
 */
export function buildParcel(items: ParcelItemInput[]): Parcel {
  let realWeight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;
  let usedDefaults = false;

  for (const item of items) {
    const quantity = Math.max(1, Math.ceil(Number(item.quantity) || 1));
    const w = positive(item.weightGram, DEFAULT_WEIGHT_GRAM);
    const l = positive(item.lengthCm, DEFAULT_DIMENSION_CM);
    const wd = positive(item.widthCm, DEFAULT_DIMENSION_CM);
    const h = positive(item.heightCm, DEFAULT_DIMENSION_CM);
    if (w.usedDefault || l.usedDefault || wd.usedDefault || h.usedDefault) usedDefaults = true;

    realWeight += w.value * quantity;
    maxLength = Math.max(maxLength, l.value);
    maxWidth = Math.max(maxWidth, wd.value);
    totalHeight += h.value * quantity;
  }

  if (items.length === 0) {
    return {
      weightGram: DEFAULT_WEIGHT_GRAM,
      lengthCm: DEFAULT_DIMENSION_CM,
      widthCm: DEFAULT_DIMENSION_CM,
      heightCm: DEFAULT_DIMENSION_CM,
      usedDefaults: true,
      exceedsLimit: false,
    };
  }

  const volumetric = volumetricWeightGram(maxLength, maxWidth, totalHeight);
  const weightGram = Math.max(realWeight, volumetric);

  return {
    weightGram,
    lengthCm: maxLength,
    widthCm: maxWidth,
    heightCm: totalHeight,
    usedDefaults,
    exceedsLimit: weightGram > GHN_MAX_WEIGHT_GRAM,
  };
}
