import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import ArticleService from './article.service';
import ArticleController from './article.controller';
import { createArticleSchema, updateArticleSchema, articleIdSchema, articleSlugSchema } from './article.validate';
// routeProtect intentionally omitted — article reads are public

export function createArticleRouter(): Router {
  const router = Router();
  const controller = new ArticleController(new ArticleService());

  // Public — published articles only
  router.get(
    '/',
    cache({ ttl: redisConfigKeys.CACHE_10_MINUTES, keyGenerator: () => cacheKey.ARTICLE_LIST }),
    controller.listArticles,
  );

  router.get(
    '/:slug',
    validate(articleSlugSchema, 'params'),
    cache({ ttl: redisConfigKeys.CACHE_10_MINUTES, keyGenerator: (req) => `${cacheKey.ARTICLE_DETAIL}:${req.params.slug}` }),
    controller.findArticleBySlug,
  );

  return router;
}

export function createAdminArticleRouter(): Router {
  const router = Router();
  const controller = new ArticleController(new ArticleService());

  router.use(adminProtect);

  router.get('/', controller.adminListAll);
  router.get('/:id', validate(articleIdSchema, 'params'), controller.adminFindById);
  router.post('/', validate(createArticleSchema), controller.create);
  router.put('/:id', validate(articleIdSchema, 'params'), validate(updateArticleSchema), controller.update);
  router.delete('/:id', validate(articleIdSchema, 'params'), controller.delete);

  return router;
}
