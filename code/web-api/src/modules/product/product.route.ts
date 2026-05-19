import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import ProductService from './product.service';
import ProductController from './product.controller';
import { createProductSchema, updateProductSchema, productIdSchema, productSlugSchema } from './product.validate';
import { createVariantRouter, createAdminVariantRouter } from '@/modules/product-variant/product-variant.route';

export function createProductRouter(): Router {
  const router = Router();
  const controller = new ProductController(new ProductService());

  // Public
  router.get('/', controller.list);

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

  router.use(adminProtect);

  router.get('/', controller.list);
  router.get('/:id', validate(productIdSchema, 'params'), controller.findById);
  router.post('/', validate(createProductSchema), controller.create);
  router.put('/:id', validate(productIdSchema, 'params'), validate(updateProductSchema), controller.update);
  router.delete('/:id', validate(productIdSchema, 'params'), controller.delete);

  // Nested admin variant routes
  router.use('/:id/variants', createAdminVariantRouter());

  return router;
}
