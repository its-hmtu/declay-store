import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IAdminAuthController, IAdminAuthService } from './admin-auth.interface';

export default class AdminAuthController implements IAdminAuthController {
  constructor(private adminAuthService: IAdminAuthService) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { access_token, refresh_token, admin } = await this.adminAuthService.login({ email, password });
    sendSuccess(res, { accessToken: access_token, refreshToken: refresh_token, admin }, 'Admin login successful');
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken || typeof refreshToken !== 'string') throw httpError(400, 'refreshToken is required');
    const { access_token, refresh_token } = await this.adminAuthService.refresh(refreshToken);
    sendSuccess(res, { accessToken: access_token, refreshToken: refresh_token }, 'Token refreshed');
  });

  getAdminInfo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw httpError(401, 'Not authenticated');
    const admin = await this.adminAuthService.getAdminInfo(req.admin.adminId);
    sendSuccess(res, admin, 'Admin info retrieved successfully');
  });
}
