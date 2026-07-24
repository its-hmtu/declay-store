import type { RequestHandler } from 'express';

export interface IReviewAuthor {
  id: number;
  fullName: string | null;
  username: string | null;
}

export interface IProductReview {
  id: number;
  userId: number;
  productId: number;
  variantId: number | null;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: IReviewAuthor;
}

export interface IReviewSummary {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface IReviewListResult {
  rows: IProductReview[];
  count: number;
  summary: IReviewSummary;
}

export interface ICreateReviewData {
  rating: number;
  title?: string | null;
  body?: string | null;
  variantId?: number | null;
}

export interface IUpdateReviewData {
  rating?: number;
  title?: string | null;
  body?: string | null;
}

export interface IReviewListQuery {
  page?: number;
  limit?: number;
}

export interface IProductReviewService {
  listByProduct(productId: number, query: IReviewListQuery): Promise<IReviewListResult>;
  create(userId: number, productId: number, data: ICreateReviewData): Promise<IProductReview>;
  update(userId: number, reviewId: number, data: IUpdateReviewData): Promise<IProductReview>;
  remove(userId: number, reviewId: number): Promise<void>;
  adminList(query: IReviewListQuery): Promise<{ rows: IProductReview[]; count: number }>;
  adminRemove(reviewId: number): Promise<void>;
}

export interface IProductReviewController {
  listByProduct: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  adminList: RequestHandler;
  adminRemove: RequestHandler;
}
