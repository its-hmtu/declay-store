/**
 * M-24: ánh xạ trạng thái vận đơn GHN → trạng thái nội bộ.
 *
 * Vì sao KHÔNG dùng mapProviderStatus chung: nó dò chuỗi con, nên "delivering"
 * (đang giao) chứa "deliver" sẽ bị nhầm thành "delivered" (đã giao) — sai chí
 * mạng vì đơn chưa tới tay khách đã bị đánh dấu hoàn tất. GHN có bộ trạng thái
 * cố định (docs id=48), nên khớp CHÍNH XÁC theo tên, không dò chuỗi.
 */

import type { ShipmentStatus } from '@/modules/shipment/shipment.status';

/** Trạng thái đơn hàng mà một trạng thái GHN nên đẩy tới (forward-only ở tầng trên). */
export type GhnDerivedOrderStatus = 'shipped' | 'delivered' | 'returned' | 'cancelled' | null;

/** GHN status (docs id=48) -> ShipmentStatus nội bộ. Khớp chính xác. */
const SHIPMENT_MAP: Record<string, ShipmentStatus> = {
  ready_to_pick: 'label_created',
  picking: 'label_created',
  money_collect_picking: 'label_created',
  picked: 'in_transit',
  storing: 'in_transit',
  transporting: 'in_transit',
  sorting: 'in_transit',
  delivering: 'out_for_delivery',
  money_collect_delivering: 'out_for_delivery',
  delivered: 'delivered',
  delivery_fail: 'exception',
  waiting_to_return: 'exception',
  return: 'returned',
  return_transporting: 'returned',
  return_sorting: 'returned',
  returning: 'returned',
  return_fail: 'exception',
  returned: 'returned',
  cancel: 'cancelled',
  exception: 'exception',
  damage: 'exception',
  lost: 'exception',
};

export function mapGhnShipmentStatus(ghnStatus: string | null | undefined): ShipmentStatus {
  const key = (ghnStatus ?? '').trim().toLowerCase();
  return SHIPMENT_MAP[key] ?? 'in_transit';
}

/**
 * Trạng thái đơn hàng suy ra từ trạng thái GHN.
 *
 * Chỉ trả về mốc RÕ RÀNG. Các trạng thái trung gian của quá trình hoàn hàng
 * (delivery_fail, waiting_to_return, exception...) trả null: đơn vẫn "shipped",
 * cần con người xử lý chứ không tự động chuyển trạng thái đơn.
 */
export function orderStatusFromGhn(ghnStatus: string | null | undefined): GhnDerivedOrderStatus {
  const s = mapGhnShipmentStatus(ghnStatus);
  switch (s) {
    case 'label_created':
    case 'in_transit':
    case 'out_for_delivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'returned':
      return 'returned';
    case 'cancelled':
      return 'cancelled';
    default:
      return null; // exception: giữ nguyên, cần người xử lý
  }
}

/** GHN gửi Type nào thì đáng xử lý (bỏ qua update_weight/update_cod/update_fee). */
export function isStatusChangeType(type: string | null | undefined): boolean {
  const t = (type ?? '').trim().toLowerCase();
  return t === 'create' || t === 'switch_status' || t === '';
}
