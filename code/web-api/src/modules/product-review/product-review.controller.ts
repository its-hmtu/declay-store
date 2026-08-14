import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IProductReviewController, IProductReviewService } from './product-review.interface';

export default class ProductReviewController implements IProductReviewController {
  constructor(private reviewService: IProductReviewService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  listByProduct = asyncHandler(async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;

    const result = await this.reviewService.listByProduct(productId, { page, limit });
    sendSuccess(res, result.rows, 'Reviews retrieved successfully', 200, {
      total: result.count,
      page: page ?? 1,
      summary: result.summary,
    });
  });

  eligibility = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as { userId?: number } | undefined;
    const result = await this.reviewService.getEligibility(
      user?.userId ?? null,
      Number(req.params.productId),
    );
    sendSuccess(res, result, 'Review eligibility retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const review = await this.reviewService.create(this.getUserId(req), productId, req.body);
    sendSuccess(res, review, 'Review submitted successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const review = await this.reviewService.update(
      this.getUserId(req),
      Number(req.params.reviewId),
      req.body,
    );
    sendSuccess(res, review, 'Review updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.reviewService.remove(this.getUserId(req), Number(req.params.reviewId));
    sendSuccess(res, null, 'Review deleted successfully');
  });

  adminList = asyncHandler(async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;

    const result = await this.reviewService.adminList({ page, limit });
    sendSuccess(res, result.rows, 'Reviews retrieved successfully', 200, {
      total: result.count,
      page: page ?? 1,
    });
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.reviewService.adminRemove(Number(req.params.reviewId));
    sendSuccess(res, null, 'Review deleted successfully');
  });
}
