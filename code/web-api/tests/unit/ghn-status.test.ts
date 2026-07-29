import { describe, it, expect } from 'vitest';
import { mapGhnShipmentStatus, orderStatusFromGhn, isStatusChangeType } from '@/modules/shipping-provider/ghn/ghn.status';

describe('mapGhnShipmentStatus (M-24)', () => {
  it('"delivering" (đang giao) KHÔNG bị nhầm thành delivered', () => {
    expect(mapGhnShipmentStatus('delivering')).toBe('out_for_delivery');
    expect(mapGhnShipmentStatus('delivered')).toBe('delivered');
  });
  it('các mốc vận chuyển', () => {
    expect(mapGhnShipmentStatus('ready_to_pick')).toBe('label_created');
    expect(mapGhnShipmentStatus('picked')).toBe('in_transit');
    expect(mapGhnShipmentStatus('transporting')).toBe('in_transit');
  });
  it('hoàn hàng và huỷ', () => {
    expect(mapGhnShipmentStatus('returned')).toBe('returned');
    expect(mapGhnShipmentStatus('cancel')).toBe('cancelled');
    expect(mapGhnShipmentStatus('delivery_fail')).toBe('exception');
    expect(mapGhnShipmentStatus('lost')).toBe('exception');
  });
  it('không phân biệt hoa thường, trạng thái lạ về in_transit', () => {
    expect(mapGhnShipmentStatus('DELIVERED')).toBe('delivered');
    expect(mapGhnShipmentStatus('trang_thai_la')).toBe('in_transit');
  });
});

describe('orderStatusFromGhn', () => {
  it('đang giao/vận chuyển -> shipped', () => {
    expect(orderStatusFromGhn('picked')).toBe('shipped');
    expect(orderStatusFromGhn('delivering')).toBe('shipped');
  });
  it('delivered -> delivered', () => {
    expect(orderStatusFromGhn('delivered')).toBe('delivered');
  });
  it('returned -> returned, cancel -> cancelled', () => {
    expect(orderStatusFromGhn('returned')).toBe('returned');
    expect(orderStatusFromGhn('cancel')).toBe('cancelled');
  });
  it('trạng thái trung gian cần người xử lý -> null', () => {
    expect(orderStatusFromGhn('delivery_fail')).toBeNull();
    expect(orderStatusFromGhn('exception')).toBeNull();
  });
});

describe('isStatusChangeType', () => {
  it('chỉ xử lý create / switch_status', () => {
    expect(isStatusChangeType('switch_status')).toBe(true);
    expect(isStatusChangeType('create')).toBe(true);
    expect(isStatusChangeType('update_weight')).toBe(false);
    expect(isStatusChangeType('update_cod')).toBe(false);
  });
});
