import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import CategoryService from './category.service';
import CategoryController from './category.controller';
import { createCategorySchema, updateCategorySchema, categoryIdSchema } from './category.validate';

export function createCategoryRouter(): Router {
  const router = Router();
  const controller = new CategoryController(new CategoryService());

  // Public
  router.get(
    '/',
    cache({ ttl: redisConfigKeys.CACHE_1_HOUR, keyGenerator: () => cacheKey.CATEGORY_LIST }),
    controller.list,
  );

  router.get(
    '/:id',
    validate(categoryIdSchema, 'params'),
    cache({ ttl: redisConfigKeys.CACHE_1_HOUR, keyGenerator: (req) => `${cacheKey.CATEGORY_DETAIL}:${req.params.id}` }),
    controller.findById,
  );

  return router;
}

export function createAdminCategoryRouter(): Router {
  const router = Router();
  const controller = new CategoryController(new CategoryService());

  router.use(adminProtect);

  router.post('/', validate(createCategorySchema), controller.create);
  router.put('/:id', validate(categoryIdSchema, 'params'), validate(updateCategorySchema), controller.update);
  router.delete('/:id', validate(categoryIdSchema, 'params'), controller.delete);

  return router;
}
