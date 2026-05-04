import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendSuccess } from "@/utils/response";
import { IArticleService, IArticleController } from "./artical.interface";
import { httpError } from "@/utils/http-error";

export default class ArticleController implements IArticleController {
  constructor(
    private articleService: IArticleService
  ) {}

  findArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    if (!slug) {
      throw httpError(400, 'Slug is required');
    }

    const article = await this.articleService.findArticleBySlug(slug);

    if (!article) {
      throw httpError(404, 'Article not found');
    }

    sendSuccess(res, article, 'Article retrieved successfully');
  });

  listArticles = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit as string | undefined;
    const offset = req.query.offset as string | undefined;

    const articles = await this.articleService.listArticles(
      limit ? parseInt(limit, 10) || 10 : 10,
      offset ? parseInt(offset, 10) || 0 : 0
    );

    sendSuccess(res, articles, 'Articles retrieved successfully');
  });
}
