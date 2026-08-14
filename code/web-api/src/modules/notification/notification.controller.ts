import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { INotificationController, INotificationService } from './notification.interface';

export default class NotificationController implements INotificationController {
  constructor(private service: INotificationService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number } | undefined;
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  private paging(req: Request): { page: number; limit: number } {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
    return { page: page > 0 ? page : 1, limit: limit > 0 && limit <= 100 ? limit : 20 };
  }

  listMine = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.paging(req);
    sendSuccess(res, await this.service.listForUser(this.getUserId(req), page, limit), 'Notifications retrieved');
  });

  markMineRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markReadForUser(this.getUserId(req), Number(req.params.id));
    sendSuccess(res, null, 'Marked as read');
  });

  markAllMineRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markAllReadForUser(this.getUserId(req));
    sendSuccess(res, null, 'All marked as read');
  });

  adminList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = this.paging(req);
    sendSuccess(res, await this.service.listForAdmin(page, limit), 'Notifications retrieved');
  });

  adminMarkRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markReadForAdmin(Number(req.params.id));
    sendSuccess(res, null, 'Marked as read');
  });

  adminMarkAllRead = asyncHandler(async (_req: Request, res: Response) => {
    await this.service.markAllReadForAdmin();
    sendSuccess(res, null, 'All marked as read');
  });
}
