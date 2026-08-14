import { httpError } from '@/utils/http-error';
import type { ShippingProvider, ShippingOrderInput, CreatedShipment } from './provider';

/**
 * Easyship aggregator provider.
 *
 * IMPORTANT: sandbox vs production is decided by the TOKEN (its prefix), not the URL —
 * endpoints are identical. `assertEasyshipEnv` guards against accidentally calling live
 * when we intend sandbox. Left as a skeleton until a real Sandbox token + payload mapping
 * are added (increment 2b), verified against the Easyship sandbox.
 */
export function assertEasyshipEnv(apiKey: string, sandbox: boolean): void {
  const looksSandbox = /sand|test/i.test(apiKey);
  if (sandbox && !looksSandbox) {
    throw httpError(500, 'EASYSHIP_SANDBOX=true but the token does not look like a Sandbox token — refusing to call live.');
  }
}

export class EasyshipProvider implements ShippingProvider {
  readonly name = 'easyship';
  readonly isMock = false;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    private sandbox: boolean,
  ) {}

  async createShipment(_order: ShippingOrderInput): Promise<CreatedShipment> {
    assertEasyshipEnv(this.apiKey, this.sandbox);
    // TODO(increment-2b): POST `${this.baseUrl}/2024-09/shipments` (Bearer this.apiKey);
    //   map order → origin/destination/parcels/items(HS codes)/incoterm(DDP);
    //   parse response → { easyship_shipment_id, courier, tracking_number, label_url, total_charge }.
    throw httpError(501, 'Easyship provider not wired yet — remove EASYSHIP_API_KEY to use the mock provider, or add the sandbox mapping (increment 2b).');
  }
}
