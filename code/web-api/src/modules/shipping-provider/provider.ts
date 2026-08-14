/** Carrier-agnostic shipping provider abstraction (W-25). */

export interface ShippingOrderInput {
  id: number;
  // Extend later with destination address, parcels, items (HS codes), weight, etc.
}

export interface CreatedShipment {
  provider: string;
  providerShipmentId: string;
  carrier: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  cost: number | null;
  currency: string | null;
  incoterm: string | null;
}

export interface ShippingProvider {
  readonly name: string;
  /** True for the local simulation provider — gates the "simulate tracking" tooling. */
  readonly isMock: boolean;
  createShipment(order: ShippingOrderInput): Promise<CreatedShipment>;
}
