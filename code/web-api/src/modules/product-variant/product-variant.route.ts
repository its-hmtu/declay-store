import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import ProductVariantService from './product-variant.service';
import ProductVariantController from './product-variant.controller';
import { createVariantSchema, updateVariantSchema, variantIdSchema } from './product-variant.validate';

export function createVariantRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new ProductVariantController(new ProductVariantService());

  router.get('/', controller.listByProduct);
  router.get('/:variantId', validate(variantIdSchema, 'params'), controller.findById);

  return router;
}

export function createAdminVariantRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new ProductVariantController(new ProductVariantService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.post('/', validate(createVariantSchema), controller.create);
  router.put('/:variantId', validate(variantIdSchema, 'params'), validate(updateVariantSchema), controller.update);
  router.delete('/:variantId', validate(variantIdSchema, 'params'), controller.delete);

  return router;
}
