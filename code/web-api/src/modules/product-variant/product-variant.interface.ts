import type { RequestHandler } from 'express';

export interface IProductVariant {
  id: number;
  productId: number;
  name: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateVariantData {
  productId: number;
  name: string;
  price: number;
  stock?: number;
  images?: string[];
}

export interface IUpdateVariantData {
  name?: string;
  price?: number;
  stock?: number;
  images?: string[];
  isActive?: boolean;
}

export interface IProductVariantService {
  listByProduct(productId: number): Promise<IProductVariant[]>;
  findById(id: number): Promise<IProductVariant>;
  create(data: ICreateVariantData): Promise<IProductVariant>;
  update(id: number, data: IUpdateVariantData): Promise<IProductVariant>;
  delete(id: number): Promise<void>;
}

export interface IProductVariantController {
  listByProduct: RequestHandler;
  findById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
