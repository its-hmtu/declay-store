import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IPageController, IPageService } from './page.interface';

export default class PageController implements IPageController {
  constructor(private pageService: IPageService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const page = await this.pageService.getPublicBySlug(String(req.params.slug));
    sendSuccess(res, page, 'Page retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.pageService.listAll(), 'Pages retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.pageService.findById(Number(req.params.id)), 'Page retrieved successfully');
  });

  adminVersions = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.pageService.listVersions(Number(req.params.id)), 'Versions retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.pageService.create(req.body, this.getAdminId(req)), 'Page created successfully', 201);
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.pageService.update(Number(req.params.id), req.body, this.getAdminId(req)), 'Page updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.pageService.remove(Number(req.params.id));
    sendSuccess(res, null, 'Page deleted successfully');
  });
}
