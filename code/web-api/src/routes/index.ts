import { Router } from 'express';

// Customer modules
import { createAuthRouter } from '@/modules/auth/auth.route';
import { createUserRouter } from '@/modules/user/user.route';
import { createAddressRoutes } from '@/modules/address/address.route';
import { createArticleRouter } from '@/modules/article/artical.route';
import { createCategoryRouter } from '@/modules/category/category.route';
import { createProductRouter } from '@/modules/product/product.route';
import { createCartRouter } from '@/modules/cart/cart.route';
import { createOrderRouter } from '@/modules/order/order.route';
import { createJobRouter } from '@/modules/job/job.route';
import { createApplicationRouter } from '@/modules/job-application/job-application.route';

// Admin modules
import { createAdminAuthRouter } from '@/modules/admin-auth/admin-auth.route';
import { createAdminArticleRouter } from '@/modules/article/artical.route';
import { createAdminCategoryRouter } from '@/modules/category/category.route';
import { createAdminProductRouter } from '@/modules/product/product.route';
import { createAdminOrderRouter } from '@/modules/order/order.route';
import { createAdminJobRouter } from '@/modules/job/job.route';
import { createAdminApplicationRouter } from '@/modules/job-application/job-application.route';

export function createRoutes(): Router {
  const router = Router();

  // ── Customer routes ──────────────────────────────────────────
  router.use('/auth', createAuthRouter());
  router.use('/users', createUserRouter());
  router.use('/addresses', createAddressRoutes());
  router.use('/articles', createArticleRouter());
  router.use('/categories', createCategoryRouter());
  router.use('/products', createProductRouter());
  router.use('/cart', createCartRouter());
  router.use('/orders', createOrderRouter());
  router.use('/jobs', createJobRouter());
  // Nested: POST /api/jobs/:jobId/applications
  router.use('/jobs/:jobId/applications', createApplicationRouter());

  // ── Admin routes ─────────────────────────────────────────────
  router.use('/admin/auth', createAdminAuthRouter());
  router.use('/admin/articles', createAdminArticleRouter());
  router.use('/admin/categories', createAdminCategoryRouter());
  router.use('/admin/products', createAdminProductRouter());
  router.use('/admin/orders', createAdminOrderRouter());
  router.use('/admin/jobs', createAdminJobRouter());
  // Nested: /api/admin/jobs/:jobId/applications
  router.use('/admin/jobs/:jobId/applications', createAdminApplicationRouter());

  return router;
}
