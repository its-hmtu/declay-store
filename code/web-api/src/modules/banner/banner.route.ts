import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import BannerService from './banner.service';
import BannerController from './banner.controller';
import { createBannerSchema, updateBannerSchema, bannerIdSchema } from './banner.validate';

export function createBannerRouter(): Router {
  const router = Router();
  const controller = new BannerController(new BannerService());

  // Public storefront list
  router.get(
    '/',
    cache({ ttl: redisConfigKeys.CACHE_10_MINUTES, keyGenerator: () => cacheKey.BANNER_LIST }),
    controller.list,
  );

  return router;
}

export function createAdminBannerRouter(): Router {
  const router = Router();
  const controller = new BannerController(new BannerService());

  router.use(adminProtect);

  router.get('/', controller.adminList);
  router.get('/:id', validate(bannerIdSchema, 'params'), controller.adminFindById);
  router.post('/', validate(createBannerSchema), controller.adminCreate);
  router.put('/:id', validate(bannerIdSchema, 'params'), validate(updateBannerSchema), controller.adminUpdate);
  router.delete('/:id', validate(bannerIdSchema, 'params'), controller.adminRemove);

  return router;
}
