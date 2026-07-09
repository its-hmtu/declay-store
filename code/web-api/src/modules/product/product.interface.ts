import type { RequestHandler } from 'express';

export interface IRatingSummary {
  average: number;
  count: number;
}

export interface IProduct {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  rating?: IRatingSummary;
  /** Total units sold across completed orders. */
  salesCount?: number;
}

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'best-sellers',
  'top-rated',
  'trending',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface IProductVariantSummary {
  id: number;
  name: string;
  price: number;
  stock: number;
  images: string[];
}

export interface IProductWithVariants extends IProduct {
  variants: IProductVariantSummary[];
}

export interface ICreateProductData {
  categoryId: number;
  name: string;
  slug: string;
  description?: string | null;
  tagIds?: number[];
}

export interface IUpdateProductData {
  categoryId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
  tagIds?: number[];
}

export interface IProductListQuery {
  categoryId?: number;
  page?: number;
  limit?: number;
  search?: string;
  sort?: ProductSort;
  /** Admin-only: include inactive (hidden) products in the result. */
  includeInactive?: boolean;
}

export interface IProductService {
  list(query: IProductListQuery): Promise<{ rows: IProduct[]; count: number }>;
  findById(id: number): Promise<IProductWithVariants>;
  findBySlug(slug: string): Promise<IProductWithVariants>;
  create(data: ICreateProductData): Promise<IProduct>;
  update(id: number, data: IUpdateProductData): Promise<IProduct>;
  delete(id: number): Promise<void>;
}

export interface IProductController {
  list: RequestHandler;
  adminList: RequestHandler;
  findById: RequestHandler;
  findBySlug: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
