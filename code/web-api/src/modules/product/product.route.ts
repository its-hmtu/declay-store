import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import ProductService from './product.service';
import ProductController from './product.controller';
import { createProductSchema, updateProductSchema, productIdSchema, productSlugSchema } from './product.validate';
import { createVariantRouter, createAdminVariantRouter } from '@/modules/product-variant/product-variant.route';
import { optionalAuth } from '@/middlewares/auth.middleware';
import { getRecommendations, recordProductView, recordRecoClick, getRecentlyViewed } from '@/modules/recommendation/recommendation.controller';

export function createProductRouter(): Router {
  const router = Router();
  const controller = new ProductController(new ProductService());

  // Public
  router.get('/', controller.list);

  // M-35: gợi ý + ghi view — ĐẶT TRƯỚC '/:id' để route tĩnh không bị nuốt.
  router.get('/recommendations', optionalAuth, getRecommendations);
  router.get('/recently-viewed', optionalAuth, getRecentlyViewed);
  router.post('/view', optionalAuth, recordProductView);
  router.post('/reco-click', optionalAuth, recordRecoClick);

  router.get(
    '/slug/:slug',
    validate(productSlugSchema, 'params'),
    cache({ ttl: redisConfigKeys.CACHE_10_MINUTES, keyGenerator: (req) => `${cacheKey.PRODUCT_DETAIL}:slug:${req.params.slug}` }),
    controller.findBySlug,
  );

  router.get(
    '/:id',
    validate(productIdSchema, 'params'),
    cache({ ttl: redisConfigKeys.CACHE_10_MINUTES, keyGenerator: (req) => `${cacheKey.PRODUCT_DETAIL}:${req.params.id}` }),
    controller.findById,
  );

  // Nested variant routes (public read)
  router.use('/:id/variants', createVariantRouter());

  return router;
}

export function createAdminProductRouter(): Router {
  const router = Router();
  const controller = new ProductController(new ProductService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminList);
  router.get('/:id', validate(productIdSchema, 'params'), controller.findById);
  router.post('/', validate(createProductSchema), controller.create);
  router.put('/:id', validate(productIdSchema, 'params'), validate(updateProductSchema), controller.update);
  router.delete('/:id', validate(productIdSchema, 'params'), controller.delete);

  // Nested admin variant routes
  router.use('/:id/variants', createAdminVariantRouter());

  return router;
}
