import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ICampaignController, ICampaignService } from './campaign.interface';

export default class CampaignController implements ICampaignController {
  constructor(private service: ICampaignService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listActive(), 'Campaigns retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listAll(), 'Campaigns retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.findById(Number(req.params.id)), 'Campaign retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.create(req.body, this.getAdminId(req)), 'Campaign created successfully', 201);
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.update(Number(req.params.id), req.body), 'Campaign updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Campaign deleted successfully');
  });

  /**
   * M-41: dry-run a campaign before saving it — margin damage + overlap with
   * campaigns already running. Read-only, never mutates.
   */
  adminPreviewImpact = asyncHandler(async (req: Request, res: Response) => {
    const { productIds, discountPercent, startsAt, endsAt, excludeCampaignId } = req.body;
    const impact = await this.service.previewImpact({
      productIds: productIds ?? [],
      discountPercent,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      excludeCampaignId: excludeCampaignId ? Number(excludeCampaignId) : undefined,
    });
    sendSuccess(res, impact, 'Campaign impact computed successfully');
  });
}
