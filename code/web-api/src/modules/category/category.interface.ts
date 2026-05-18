import type { RequestHandler } from 'express';

export interface ICategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCategoryData {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
}

export interface IUpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: number | null;
  isActive?: boolean;
}

export interface ICategoryService {
  list(): Promise<ICategory[]>;
  findById(id: number): Promise<ICategory>;
  findBySlug(slug: string): Promise<ICategory>;
  create(data: ICreateCategoryData): Promise<ICategory>;
  update(id: number, data: IUpdateCategoryData): Promise<ICategory>;
  delete(id: number): Promise<void>;
}

export interface ICategoryController {
  list: RequestHandler;
  findById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
