import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ISiteSettingController, ISiteSettingService } from './site-setting.interface';

export default class SiteSettingController implements ISiteSettingController {
  constructor(private settingService: ISiteSettingService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  // Public: storefront key/value map (public.* keys, prefix stripped)
  getPublic = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.settingService.getPublicSettings();
    sendSuccess(res, settings, 'Settings retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.settingService.listAll();
    sendSuccess(res, settings, 'Settings retrieved successfully');
  });

  adminGet = asyncHandler(async (req: Request, res: Response) => {
    const setting = await this.settingService.get(req.params.key as string);
    sendSuccess(res, setting, 'Setting retrieved successfully');
  });

  adminUpsert = asyncHandler(async (req: Request, res: Response) => {
    const { value } = req.body;
    const setting = await this.settingService.upsert(req.params.key as string, value, this.getAdminId(req));
    sendSuccess(res, setting, 'Setting saved successfully');
  });

  adminBulkUpsert = asyncHandler(async (req: Request, res: Response) => {
    const { settings } = req.body;
    const saved = await this.settingService.bulkUpsert(settings, this.getAdminId(req));
    sendSuccess(res, saved, 'Settings saved successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.settingService.remove(req.params.key as string);
    sendSuccess(res, null, 'Setting deleted successfully');
  });
}
