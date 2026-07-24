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
}
