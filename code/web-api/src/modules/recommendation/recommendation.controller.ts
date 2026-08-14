import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import RecommendationService, { type RecoContext } from './recommendation.service';

const service = new RecommendationService();

function parseIds(v: unknown): number[] {
  if (typeof v !== 'string') return [];
  return v.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

/** GET /products/recommendations?context=&productIds=&limit= (optionalAuth). */
export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const context = (req.query.context as RecoContext) || 'home';
  const productIds = parseIds(req.query.productIds ?? req.query.productId);
  const limit = Math.min(Number(req.query.limit) || 4, 12);
  const userId = (req.user as { userId?: number } | undefined)?.userId ?? null;
  const sessionId = req.header('X-Guest-Session') ?? null;
  const rows = await service.recommend({ context, productIds, userId, sessionId, limit });
  sendSuccess(res, rows, 'Recommendations');
});

/** POST /products/view { productId } — ghi sự kiện xem (M-35, P-Q2). */
export const recordProductView = asyncHandler(async (req: Request, res: Response) => {
  const productId = Number(req.body?.productId);
  if (!Number.isInteger(productId) || productId <= 0) { sendSuccess(res, null, 'ignored'); return; }
  const userId = (req.user as { userId?: number } | undefined)?.userId ?? null;
  const sessionId = req.header('X-Guest-Session') ?? null;
  await service.recordView({ productId, userId, sessionId });
  sendSuccess(res, null, 'ok');
});

/** GET /products/recently-viewed?limit=&excludeIds= (optionalAuth). */
export const getRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 4, 12);
  const excludeIds = parseIds(req.query.excludeIds);
  const userId = (req.user as { userId?: number } | undefined)?.userId ?? null;
  const sessionId = req.header('X-Guest-Session') ?? null;
  const rows = await service.recentlyViewed({ userId, sessionId, limit, excludeIds });
  sendSuccess(res, rows, 'Recently viewed');
});

const RECO_CONTEXTS: RecoContext[] = ['cart', 'detail', 'post_purchase', 'home', 'account'];

/** POST /products/reco-click { productId, context } — ghi click gợi ý (M-35 CTR). */
export const recordRecoClick = asyncHandler(async (req: Request, res: Response) => {
  const productId = Number(req.body?.productId);
  const context = req.body?.context as RecoContext;
  if (!Number.isInteger(productId) || productId <= 0 || !RECO_CONTEXTS.includes(context)) {
    sendSuccess(res, null, 'ignored');
    return;
  }
  const userId = (req.user as { userId?: number } | undefined)?.userId ?? null;
  const sessionId = req.header('X-Guest-Session') ?? null;
  await service.logClick({ productId, context, userId, sessionId });
  sendSuccess(res, null, 'ok');
});
