/**
 * M-13b: luật phí vận chuyển cuối cùng tính cho khách.
 *
 * GHN báo giá cước; nhưng số tiền khách TRẢ còn phụ thuộc chính sách cửa hàng
 * (miễn phí từ ngưỡng nào, có trợ giá không). Tách riêng để đổi chính sách
 * không phải đụng vào tầng gọi API.
 */

/** Làm tròn phí ship về đồng chẵn cho khớp cách niêm yết giá. */
export const FEE_ROUNDING_UNIT = 1000;

export interface FeePolicyInput {
  /** Cước GHN trả về (VND). */
  carrierFeeVnd: number;
  /** Tổng tiền hàng trước phí ship (VND). */
  subtotalVnd: number;
  /** Miễn phí ship khi tiền hàng >= ngưỡng này. null = không áp dụng. */
  freeOverVnd?: number | null;
  /** Cửa hàng trợ giá cố định mỗi đơn (VND). */
  subsidyVnd?: number | null;
}

export interface FeeResult {
  /** Số tiền khách phải trả cho vận chuyển. */
  customerFeeVnd: number;
  /** Cước thực trả cho GHN — dùng để tính lãi/lỗ, không hiển thị cho khách. */
  carrierFeeVnd: number;
  /** Phần cửa hàng gánh. */
  shopBearsVnd: number;
  freeShipping: boolean;
}

export function applyFeePolicy(input: FeePolicyInput): FeeResult {
  const carrierFeeVnd = Math.max(0, Math.round(Number(input.carrierFeeVnd) || 0));
  const subtotal = Math.max(0, Number(input.subtotalVnd) || 0);
  const freeOver = input.freeOverVnd == null ? null : Number(input.freeOverVnd);
  const subsidy = Math.max(0, Number(input.subsidyVnd) || 0);

  const freeShipping = freeOver != null && freeOver > 0 && subtotal >= freeOver;

  let customerFee = freeShipping ? 0 : Math.max(0, carrierFeeVnd - subsidy);
  // Làm tròn XUỐNG đồng chẵn: phần lẻ cửa hàng chịu, khách không thấy số lạ.
  customerFee = Math.floor(customerFee / FEE_ROUNDING_UNIT) * FEE_ROUNDING_UNIT;

  return {
    customerFeeVnd: customerFee,
    carrierFeeVnd,
    shopBearsVnd: Math.max(0, carrierFeeVnd - customerFee),
    freeShipping,
  };
}

/**
 * Mã lý do khi KHÔNG báo được phí. Trả mã thay vì ném lỗi để tầng trên quyết
 * định hiển thị gì — checkout cần chặn đặt hàng chứ không phải hiện lỗi 500.
 */
export type QuoteBlockedReason =
  | 'missing_destination'   // khách chưa chọn đủ quận + phường
  | 'district_not_served'   // GHN không giao tới quận này
  | 'parcel_too_heavy'      // vượt giới hạn cân của dịch vụ
  | 'no_pickup'             // chưa cấu hình địa chỉ kho lấy hàng
  | 'route_not_found'       // GHN không có tuyến kho -> điểm đến
  | 'carrier_unavailable';  // GHN lỗi/không phản hồi (tạm thời)

export function quoteBlockedReason(input: {
  districtId: number | null;
  wardCode: string | null;
  districtSupportsDelivery: boolean;
  parcelExceedsLimit: boolean;
}): QuoteBlockedReason | null {
  if (!input.districtId || !input.wardCode) return 'missing_destination';
  if (!input.districtSupportsDelivery) return 'district_not_served';
  if (input.parcelExceedsLimit) return 'parcel_too_heavy';
  return null;
}

/** GHN SupportType: 0 khoá, 1 lấy/thu hộ, 2 giao, 3 lấy+giao+thu hộ. */
export function districtSupportsDelivery(supportType: number | null | undefined): boolean {
  return supportType === 2 || supportType === 3;
}
