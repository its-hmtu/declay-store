import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IAdminUserController, IAdminUserService } from './admin-user.interface';

export default class AdminUserController implements IAdminUserController {
  constructor(private adminUserService: IAdminUserService) {}

  private getActingAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit), 100) : 20;
    const result = await this.adminUserService.list(page, limit);
    sendSuccess(res, result.rows, 'Admins retrieved successfully', 200, {
      total: result.count,
      page,
      limit,
    });
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminUserService.findById(Number(req.params.id));
    sendSuccess(res, admin, 'Admin retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminUserService.create(req.body);
    sendSuccess(res, admin, 'Admin created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminUserService.update(
      Number(req.params.id),
      req.body,
      this.getActingAdminId(req),
    );
    sendSuccess(res, admin, 'Admin updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.adminUserService.remove(Number(req.params.id), this.getActingAdminId(req));
    sendSuccess(res, null, 'Admin deleted successfully');
  });
}
