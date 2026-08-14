/**
 * Carrier-agnostic shipment status model (W-25).
 *
 * Aggregators (Easyship/Shippo) and direct carriers all report free-form tracking
 * statuses. We normalise them to a small internal set, then derive the customer-facing
 * order status. Kept pure so it is fully unit-testable and has no I/O.
 */

export type ShipmentStatus =
  | 'created'          // shipment record exists, no label yet
  | 'label_created'    // label bought / info received, awaiting pickup
  | 'in_transit'       // picked up, moving through the network
  | 'out_for_delivery' // with the courier for final delivery
  | 'delivered'        // confirmed delivered by the carrier
  | 'exception'        // failed attempt / customs hold / error
  | 'returned'         // returned to sender
  | 'cancelled';

/** Map a raw provider status string to our internal shipment status. */
export function mapProviderStatus(raw: string | null | undefined): ShipmentStatus {
  const s = (raw ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (!s) return 'in_transit';

  // Order matters: check the more specific phrases first.
  if (s.includes('out for delivery') || s.includes('outfordelivery')) return 'out_for_delivery';
  if (s.includes('deliver')) return 'delivered';                 // "delivered", "delivery success"
  if (s.includes('return') || s.includes('rts')) return 'returned';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('exception') || s.includes('fail') || s.includes('expired') || s.includes('hold') || s.includes('problem')) return 'exception';
  if (s.includes('transit') || s.includes('shipped') || s.includes('picked') || s.includes('dispatch')) return 'in_transit';
  if (s.includes('label') || s.includes('info received') || s.includes('pending') || s.includes('created') || s.includes('pickup') || s.includes('manifest')) return 'label_created';

  return 'in_transit';
}

/**
 * Which order status (if any) a shipment status should advance the order to.
 * Returns null when the shipment status must NOT change the order (e.g. label
 * created, exception, returned — those are handled by humans / reconciliation).
 */
export function orderStatusForShipment(status: ShipmentStatus): 'shipped' | 'delivered' | null {
  switch (status) {
    case 'in_transit':
    case 'out_for_delivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
      return null;
  }
}

/** Terminal shipment states — no further tracking updates should mutate them. */
export function isShipmentTerminal(status: ShipmentStatus): boolean {
  return status === 'delivered' || status === 'returned' || status === 'cancelled';
}
