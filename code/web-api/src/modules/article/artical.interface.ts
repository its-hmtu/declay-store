import type { RequestHandler } from 'express';

export interface IArticle {
  id: number;
  title: string;
  content: string;
  authorId: number;
  slug: string;
  views: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateArticleData {
  title: string;
  content: string;
  slug: string;
  authorId: number;
}

export interface IUpdateArticleData {
  title?: string;
  content?: string;
  slug?: string;
  isPublished?: boolean;
}

export interface IArticleService {
  findArticleBySlug(slug: string): Promise<IArticle | null>;
  findById(id: number): Promise<IArticle>;
  listArticles(limit?: number, offset?: number): Promise<IArticle[]>;
  listAll(limit?: number, offset?: number): Promise<IArticle[]>;
  create(data: ICreateArticleData): Promise<IArticle>;
  update(id: number, data: IUpdateArticleData): Promise<IArticle>;
  delete(id: number): Promise<void>;
}

export interface IArticleController {
  findArticleBySlug: RequestHandler;
  listArticles: RequestHandler;
  // Admin
  adminListAll: RequestHandler;
  adminFindById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
