import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IBannerController, IBannerService } from './banner.interface';

export default class BannerController implements IBannerController {
  constructor(private bannerService: IBannerService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  // Public: storefront banners currently in their scheduling window
  list = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.listActive();
    sendSuccess(res, banners, 'Banners retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.listAll();
    sendSuccess(res, banners, 'Banners retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    const banner = await this.bannerService.findById(Number(req.params.id));
    sendSuccess(res, banner, 'Banner retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    const banner = await this.bannerService.create(req.body, this.getAdminId(req));
    sendSuccess(res, banner, 'Banner created successfully', 201);
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    const banner = await this.bannerService.update(Number(req.params.id), req.body);
    sendSuccess(res, banner, 'Banner updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.bannerService.remove(Number(req.params.id));
    sendSuccess(res, null, 'Banner deleted successfully');
  });
}
