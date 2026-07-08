import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import type { IShippingMethodController, IShippingMethodService } from './shipping-method.interface';

export default class ShippingMethodController implements IShippingMethodController {
  constructor(private service: IShippingMethodService) {}

  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listActive(), 'Shipping methods retrieved successfully');
  });

  adminList = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listAll(), 'Shipping methods retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.findById(Number(req.params.id)), 'Shipping method retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.create(req.body), 'Shipping method created successfully', 201);
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.update(Number(req.params.id), req.body), 'Shipping method updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.service.remove(Number(req.params.id));
    sendSuccess(res, null, 'Shipping method deleted successfully');
  });
}
