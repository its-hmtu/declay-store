import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import { IArticleService, IArticleController } from './artical.interface';

export default class ArticleController implements IArticleController {
  constructor(private articleService: IArticleService) {}

  findArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
    const article = await this.articleService.findArticleBySlug(req.params.slug as string);
    if (!article) throw httpError(404, 'Article not found');
    sendSuccess(res, article, 'Article retrieved successfully');
  });

  listArticles = asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 10 : 10;
    const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) || 0 : 0;
    const articles = await this.articleService.listArticles(limit, offset);
    sendSuccess(res, articles, 'Articles retrieved successfully');
  });

  adminFindById = asyncHandler(async (req: Request, res: Response) => {
    const article = await this.articleService.findById(Number(req.params.id));
    sendSuccess(res, article, 'Article retrieved successfully');
  });

  adminListAll = asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 20 : 20;
    const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) || 0 : 0;
    const articles = await this.articleService.listAll(limit, offset);
    sendSuccess(res, articles, 'Articles retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw httpError(401, 'Not authenticated');
    const article = await this.articleService.create({ ...req.body, authorId: req.admin.adminId });
    sendSuccess(res, article, 'Article created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const article = await this.articleService.update(Number(req.params.id), req.body);
    sendSuccess(res, article, 'Article updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.articleService.delete(Number(req.params.id));
    sendSuccess(res, null, 'Article deleted successfully');
  });
}
