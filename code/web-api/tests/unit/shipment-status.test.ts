import { describe, it, expect } from 'vitest';
import { mapProviderStatus, orderStatusForShipment, isShipmentTerminal } from '@/modules/shipment/shipment.status';

describe('mapProviderStatus', () => {
  it('maps delivered variants', () => {
    expect(mapProviderStatus('Delivered')).toBe('delivered');
    expect(mapProviderStatus('DELIVERY_SUCCESS')).toBe('delivered');
  });
  it('distinguishes out-for-delivery from delivered', () => {
    expect(mapProviderStatus('OutForDelivery')).toBe('out_for_delivery');
    expect(mapProviderStatus('out_for_delivery')).toBe('out_for_delivery');
  });
  it('maps transit / pickup', () => {
    expect(mapProviderStatus('InTransit')).toBe('in_transit');
    expect(mapProviderStatus('Picked Up')).toBe('in_transit');
  });
  it('maps label / info received', () => {
    expect(mapProviderStatus('Info Received')).toBe('label_created');
    expect(mapProviderStatus('label_created')).toBe('label_created');
    expect(mapProviderStatus('PendingPickup')).toBe('label_created');
  });
  it('maps return / exception / cancel', () => {
    expect(mapProviderStatus('ReturnedToSender')).toBe('returned');
    expect(mapProviderStatus('Exception')).toBe('exception');
    expect(mapProviderStatus('AttemptFail')).toBe('exception');
    expect(mapProviderStatus('Cancelled')).toBe('cancelled');
  });
  it('defaults unknown to in_transit and handles empty', () => {
    expect(mapProviderStatus('some-weird-code')).toBe('in_transit');
    expect(mapProviderStatus('')).toBe('in_transit');
    expect(mapProviderStatus(null)).toBe('in_transit');
  });
});

describe('orderStatusForShipment', () => {
  it('advances to shipped for transit states', () => {
    expect(orderStatusForShipment('in_transit')).toBe('shipped');
    expect(orderStatusForShipment('out_for_delivery')).toBe('shipped');
  });
  it('advances to delivered only when delivered', () => {
    expect(orderStatusForShipment('delivered')).toBe('delivered');
  });
  it('does not advance the order for label/exception/returned/created', () => {
    expect(orderStatusForShipment('label_created')).toBeNull();
    expect(orderStatusForShipment('exception')).toBeNull();
    expect(orderStatusForShipment('returned')).toBeNull();
    expect(orderStatusForShipment('created')).toBeNull();
  });
});

describe('isShipmentTerminal', () => {
  it('flags terminal states', () => {
    expect(isShipmentTerminal('delivered')).toBe(true);
    expect(isShipmentTerminal('returned')).toBe(true);
    expect(isShipmentTerminal('cancelled')).toBe(true);
    expect(isShipmentTerminal('in_transit')).toBe(false);
  });
});
