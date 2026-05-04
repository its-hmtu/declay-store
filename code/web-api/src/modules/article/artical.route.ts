import ArticleController from "./article.controller";
import { Router } from "express";
import { validate } from "@/middlewares/validate";
import { routeProtect } from "@/middlewares/auth.middleware";
import { IArticleService } from "./artical.interface";
import ArticleService from "./article.service";
import { 
  createArticleSchema, 
  updateArticleSchema,
  articleIdSchema,
  articleSlugSchema 
} from "./article.validate";

export function createArticleRouter(): Router {
  const router = Router();
  const articleService: IArticleService = new ArticleService();
  const articleController = new ArticleController(articleService);

  // Public routes
  router.get('/', articleController.listArticles);
  router.get('/:slug', validate(articleSlugSchema), articleController.findArticleBySlug);

  return router;
}
