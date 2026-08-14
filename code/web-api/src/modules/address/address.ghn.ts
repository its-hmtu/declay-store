/**
 * M-13 (sửa lỗi xung đột sổ địa chỉ ↔ checkout): suy ra điểm đến GHN từ một
 * địa chỉ đã lưu.
 *
 * Bối cảnh lỗi: sổ địa chỉ trước đây dùng ô nhập text tự do nên KHÔNG lưu mã
 * địa giới GHN. Thành viên chọn địa chỉ mặc định → checkout không có mã để hỏi
 * phí → nút thanh toán bị khoá vĩnh viễn. Hàm này là ranh giới rõ ràng giữa
 * "địa chỉ dùng được để giao" và "địa chỉ cần cập nhật".
 */

export interface AddressGhnCodes {
  ghnDistrictId?: number | null;
  ghnWardCode?: string | null;
}

export interface GhnDestination {
  districtId: number;
  wardCode: string;
}

/**
 * Trả điểm đến GHN nếu địa chỉ đã có đủ mã; ngược lại trả null để tầng trên
 * hiển thị "vui lòng cập nhật địa chỉ".
 */
export function ghnDestinationFromAddress(address: AddressGhnCodes | null | undefined): GhnDestination | null {
  if (!address) return null;
  const districtId = Number(address.ghnDistrictId);
  const wardCode = address.ghnWardCode ? String(address.ghnWardCode) : '';
  if (!Number.isInteger(districtId) || districtId <= 0 || wardCode.length === 0) return null;
  return { districtId, wardCode };
}

/** Địa chỉ này có giao được qua GHN không — dùng để bật/tắt nút thanh toán. */
export function addressIsShippable(address: AddressGhnCodes | null | undefined): boolean {
  return ghnDestinationFromAddress(address) !== null;
}
