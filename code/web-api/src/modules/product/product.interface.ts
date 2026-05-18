import type { RequestHandler } from 'express';

export interface IProduct {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
}

export interface IUpdateProductData {
  categoryId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface IProductListQuery {
  categoryId?: number;
  page?: number;
  limit?: number;
  search?: string;
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
  findById: RequestHandler;
  findBySlug: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
