/**
 * M-29d: quyết định định tuyến huỷ đơn. Thuần, không I/O — tách để test.
 */

/** Trạng thái cho phép khách TỰ huỷ (trước khi bàn giao GHN). */
export const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'processing'] as const;

export type CancelRoute = 'blocked' | 'request' | 'immediate';

/**
 * - `blocked`   : trạng thái không cho huỷ (đã giao/đã huỷ/đã trả...).
 * - `request`   : còn huỷ được nhưng ĐÃ có vận đơn GHN -> cần admin duyệt.
 * - `immediate` : huỷ ngay (chưa có vận đơn).
 */
export function cancelRoute(status: string, hasRealWaybill: boolean): CancelRoute {
  if (!CANCELLABLE_STATUSES.includes(status as (typeof CANCELLABLE_STATUSES)[number])) return 'blocked';
  return hasRealWaybill ? 'request' : 'immediate';
}

/**
 * Có phát sinh hoàn tiền khi huỷ hay không: chỉ khi ĐÃ thực thu (có Payment
 * succeeded). COD chưa giao chưa có tiền nên không hoàn (A3).
 */
export function shouldRefundOnCancel(hasSucceededPayment: boolean): boolean {
  return hasSucceededPayment;
}
