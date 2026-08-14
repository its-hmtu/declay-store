import config from '@/config/env';
import type { ShippingProvider, ShippingOrderInput, CreatedShipment } from './provider';

/**
 * Local simulation provider — creates fake shipment ids/labels with no external calls,
 * so the full fulfillment flow (create → track → delivered) is testable without any
 * carrier account. Swap to a real provider by setting EASYSHIP_API_KEY.
 */
export class MockShippingProvider implements ShippingProvider {
  readonly name = 'mock';
  readonly isMock = true;

  async createShipment(order: ShippingOrderInput): Promise<CreatedShipment> {
    const id = `MOCK-${order.id}-${Date.now().toString(36)}`;
    const trackingNumber = 'MK' + Math.random().toString(36).slice(2, 10).toUpperCase();
    return {
      provider: 'mock',
      providerShipmentId: id,
      carrier: 'Mock Express',
      trackingNumber,
      labelUrl: `https://example.test/labels/${id}.pdf`,
      cost: 5,
      currency: 'USD',
      incoterm: config.easyship.incotermDefault,
    };
  }
}
