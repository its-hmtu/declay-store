import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ICollectionController, ICollectionService } from './collection.interface';

export default class CollectionController implements ICollectionController {
  constructor(private service: ICollectionService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listActive(), 'Collections retrieved successfully');
  });

  detailBySlug = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.findBySlug(String(req.params.slug)), 'Collection retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listAll(), 'Collections retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.findById(Number(req.params.id)), 'Collection retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.create(req.body, this.getAdminId(req)), 'Collection created successfully', 201);
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.update(Number(req.params.id), req.body), 'Collection updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Collection deleted successfully');
  });
}
