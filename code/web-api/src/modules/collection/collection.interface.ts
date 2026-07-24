import type { RequestHandler } from 'express';
import type { IProduct } from '@/modules/product/product.interface';

export interface ICollection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  productIds?: number[];
  products?: IProduct[];
  productCount?: number;
}

export interface ICreateCollectionData {
  name: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  productIds?: number[];
}

export type IUpdateCollectionData = Partial<ICreateCollectionData>;

export interface ICollectionService {
  listActive(): Promise<ICollection[]>;
  listAll(): Promise<ICollection[]>;
  findById(id: number): Promise<ICollection>;
  findBySlug(slug: string): Promise<ICollection>;
  create(data: ICreateCollectionData, adminId: number): Promise<ICollection>;
  update(id: number, data: IUpdateCollectionData): Promise<ICollection>;
  remove(id: number): Promise<void>;
}

export interface ICollectionController {
  list: RequestHandler;
  detailBySlug: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
