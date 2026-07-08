import type { RequestHandler } from 'express';

export interface IPage {
  id: number;
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
  effectiveDate: string | null;
  version: number;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageVersion {
  id: number;
  pageId: number;
  version: number;
  title: string;
  body: string;
  effectiveDate: string | null;
  isPublished: boolean;
  editedBy: number | null;
  createdAt: Date;
}

export interface ICreatePageData {
  slug: string;
  title: string;
  body: string;
  isPublished?: boolean;
  effectiveDate?: string | null;
}

export interface IUpdatePageData {
  title?: string;
  body?: string;
  isPublished?: boolean;
  effectiveDate?: string | null;
}

export interface IPageService {
  getPublicBySlug(slug: string): Promise<IPage>;
  listAll(): Promise<IPage[]>;
  findById(id: number): Promise<IPage>;
  listVersions(pageId: number): Promise<IPageVersion[]>;
  create(data: ICreatePageData, adminId: number): Promise<IPage>;
  update(id: number, data: IUpdatePageData, adminId: number): Promise<IPage>;
  remove(id: number): Promise<void>;
}

export interface IPageController {
  getBySlug: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminVersions: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
