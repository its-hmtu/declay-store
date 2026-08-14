import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IDiscountController, IDiscountService } from './discount.interface';

export default class DiscountController implements IDiscountController {
  constructor(private discountService: IDiscountService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  // Customer: preview a code against their current cart
  validate = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const result = await this.discountService.previewForCart(this.getUserId(req), code);
    sendSuccess(res, result, 'Discount code applied');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    const discount = await this.discountService.create(req.body);
    sendSuccess(res, discount, 'Discount code created', 201);
  });

  adminList = asyncHandler(async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit), 100) : 20;
    const result = await this.discountService.list(page, limit);
    sendSuccess(res, result.rows, 'Discount codes retrieved successfully', 200, {
      total: result.count,
      page,
      limit,
    });
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    const discount = await this.discountService.findById(Number(req.params.id));
    sendSuccess(res, discount, 'Discount code retrieved successfully');
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    const discount = await this.discountService.update(Number(req.params.id), req.body);
    sendSuccess(res, discount, 'Discount code updated');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.discountService.remove(Number(req.params.id));
    sendSuccess(res, null, 'Discount code deleted');
  });
}
