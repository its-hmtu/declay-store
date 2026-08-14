import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import ReportService from './report.service';

export default class ReportController {
  constructor(private service: ReportService) {}

  topSkus = asyncHandler(async (req: Request, res: Response) => {
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit) || 20, 100) : 20;
    sendSuccess(res, await this.service.topSkus(period, limit), 'Top SKUs retrieved successfully');
  });

  productViews = asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit) || 20, 100) : 20;
    sendSuccess(res, await this.service.productViews(limit), 'Product views retrieved successfully');
  });

  campaignPerformance = asyncHandler(async (req: Request, res: Response) => {
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    sendSuccess(res, await this.service.campaignPerformance(period), 'Campaign performance retrieved successfully');
  });

  recommendationCtr = asyncHandler(async (req: Request, res: Response) => {
    const period = typeof req.query.period === 'string' ? req.query.period : '30d';
    sendSuccess(res, await this.service.recommendationCtr(period), 'Recommendation CTR retrieved successfully');
  });
}
