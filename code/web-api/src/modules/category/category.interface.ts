import type { RequestHandler } from 'express';

export interface ICategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  /** M-47: show this category as a product row on the home page. */
  showOnHome: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCategoryData {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
  showOnHome?: boolean;
}

export interface IUpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: number | null;
  isActive?: boolean;
  showOnHome?: boolean;
}

export interface ICategoryService {
  /** M-47: `homeOnly` narrows to categories flagged for the home page. */
  list(homeOnly?: boolean): Promise<ICategory[]>;
  listAll(): Promise<ICategory[]>;
  findById(id: number): Promise<ICategory>;
  findBySlug(slug: string): Promise<ICategory>;
  // Return a category by exact name, or null if not found. Used by admin tools.
  findByName?(name: string): Promise<ICategory | null>;
  create(data: ICreateCategoryData): Promise<ICategory>;
  update(id: number, data: IUpdateCategoryData): Promise<ICategory>;
  delete(id: number): Promise<void>;
}

export interface ICategoryController {
  list: RequestHandler;
  adminList: RequestHandler;
  findById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
