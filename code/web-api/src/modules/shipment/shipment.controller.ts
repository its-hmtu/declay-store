import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import config from '@/config/env';
import ShipmentService from './shipment.service';

/**
 * Aggregator (Easyship) tracking webhook. Easyship POSTs a tracking event whenever
 * a shipment's status changes; we verify a shared secret, then hand off to the
 * carrier-agnostic ShipmentService. Field names are read defensively because the
 * exact payload shape depends on the Easyship API version in use.
 */
export default class ShipmentWebhookController {
  constructor(private service: ShipmentService) {}

  easyship = asyncHandler(async (req: Request, res: Response) => {
    const secret = req.header('X-Easyship-Webhook-Secret') ?? (typeof req.query.secret === 'string' ? req.query.secret : undefined);
    if (config.easyship.webhookSecret && secret !== config.easyship.webhookSecret) {
      res.status(401).json({ success: false, message: 'Invalid webhook secret' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, any>;
    const shipmentNode = body.shipment ?? body.tracking ?? body;
    const providerShipmentId: string | undefined =
      body.easyship_shipment_id ?? shipmentNode.easyship_shipment_id ?? shipmentNode.shipment_id ?? shipmentNode.id;
    const rawStatus: string | undefined =
      body.status ?? body.tracking_status ?? shipmentNode.status ?? shipmentNode.tracking_status;

    if (!providerShipmentId || !rawStatus) {
      res.status(400).json({ success: false, message: 'Missing shipment id or status' });
      return;
    }

    const at = body.updated_at ? new Date(body.updated_at) : new Date();
    const podUrl: string | null = body.pod_url ?? shipmentNode.proof_of_delivery ?? null;

    const result = await this.service.applyTrackingUpdate({
      providerShipmentId,
      rawStatus,
      event: body.event_type ?? rawStatus,
      at,
      podUrl,
    });

    res.json({ success: true, data: result });
  });
}
