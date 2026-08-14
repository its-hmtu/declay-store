import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect, optionalAuth } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import ProductReviewService from './product-review.service';
import ProductReviewController from './product-review.controller';
import {
  createReviewSchema,
  updateReviewSchema,
  productIdParamSchema,
  reviewIdParamSchema,
} from './product-review.validate';

// Nested under /api/products/:productId/reviews
export function createProductReviewRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new ProductReviewController(new ProductReviewService());

  // Public read
  router.get('/', validate(productIdParamSchema, 'params'), controller.listByProduct);

  // M-10: eligibility check so the UI can explain instead of failing on submit
  router.get('/eligibility', optionalAuth, validate(productIdParamSchema, 'params'), controller.eligibility);

  // Authenticated write
  router.post(
    '/',
    routeProtect,
    validate(productIdParamSchema, 'params'),
    validate(createReviewSchema),
    controller.create,
  );
  router.put(
    '/:reviewId',
    routeProtect,
    validate(reviewIdParamSchema, 'params'),
    validate(updateReviewSchema),
    controller.update,
  );
  router.delete(
    '/:reviewId',
    routeProtect,
    validate(reviewIdParamSchema, 'params'),
    controller.remove,
  );

  return router;
}

// Admin moderation: /api/admin/reviews
export function createAdminReviewRouter(): Router {
  const router = Router();
  const controller = new ProductReviewController(new ProductReviewService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminList);
  router.delete('/:reviewId', validate(reviewIdParamSchema, 'params'), controller.adminRemove);

  return router;
}
