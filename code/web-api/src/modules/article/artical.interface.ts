import type { RequestHandler } from 'express';

export interface IArticle {
  id: number;
  title: string;
  content: string;
  authorId: number;
  slug: string;
  createdAt: Date;
}

export interface IArticleService {
  findArticleBySlug(slug: string): Promise<IArticle | null>;
  listArticles( 
    limit?: number,
    offset?: number
  ): Promise<IArticle[]>;
}

export interface IArticleController {
  findArticleBySlug: RequestHandler;
  listArticles: RequestHandler;
}