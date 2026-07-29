/**
 * M-22: nhãn & mô tả cho các loại dịch vụ GHN — hàm thuần, test được.
 *
 * GHN chỉ trả `short_name` ("Nhanh"/"Chuẩn"/"Tiết kiệm") và `service_type_id`.
 * Storefront cần tên và mô tả nhất quán, không phụ thuộc GHN có trả short_name
 * hay không (đôi khi rỗng), nên ánh xạ ở một chỗ duy nhất.
 */

export interface ServiceMeta {
  name: string;
  description: string;
}

/** service_type_id: 1 = Nhanh (Express), 2 = Chuẩn (Standard), 5 = Hàng nặng. */
const BY_TYPE: Record<number, ServiceMeta> = {
  1: { name: 'Giao nhanh', description: 'Nhanh nhất, phí cao hơn' },
  2: { name: 'Giao tiêu chuẩn', description: 'Cân bằng giữa giá và thời gian' },
  3: { name: 'Giao tiết kiệm', description: 'Rẻ nhất, giao chậm hơn' },
  5: { name: 'Giao hàng nặng', description: 'Dành cho kiện cồng kềnh' },
};

export function serviceMeta(serviceTypeId: number, shortName?: string | null): ServiceMeta {
  const known = BY_TYPE[serviceTypeId];
  if (known) return known;
  // Không nhận diện được thì dùng short_name của GHN, tránh hiện "undefined".
  const fallback = (shortName ?? '').trim();
  return {
    name: fallback || 'Giao hàng',
    description: '',
  };
}

/**
 * Thứ tự hiển thị: nhanh trước, tiết kiệm sau (1 → 2 → 5 → còn lại).
 * Khách quen nhìn tuỳ chọn nhanh nhất ở trên cùng.
 */
export function serviceSortWeight(serviceTypeId: number): number {
  const order: Record<number, number> = { 1: 0, 2: 1, 5: 2 };
  return order[serviceTypeId] ?? 9;
}

/** Số ngày giao dự kiến (làm tròn lên) từ hai mốc Unix giây. */
export function leadtimeDays(leadtimeSec: number, orderDateSec: number): number | null {
  if (!Number.isFinite(leadtimeSec) || !Number.isFinite(orderDateSec)) return null;
  if (leadtimeSec <= orderDateSec) return null;
  return Math.max(1, Math.ceil((leadtimeSec - orderDateSec) / 86400));
}
