import { Router } from 'express';

// Customer modules
import { createAuthRouter } from '@/modules/auth/auth.route';
import { createUserRouter } from '@/modules/user/user.route';
import { createAddressRoutes } from '@/modules/address/address.route';
import { createArticleRouter } from '@/modules/article/artical.route';
import { createCategoryRouter } from '@/modules/category/category.route';
import { createProductRouter } from '@/modules/product/product.route';
import { createProductReviewRouter } from '@/modules/product-review/product-review.route';
import { createCartRouter } from '@/modules/cart/cart.route';
import { createWishlistRouter } from '@/modules/wishlist/wishlist.route';
import { createDiscountRouter } from '@/modules/discount/discount.route';
import { createBannerRouter } from '@/modules/banner/banner.route';
import { createPageRouter } from '@/modules/page/page.route';
import { createShippingMethodRouter } from '@/modules/shipping-method/shipping-method.route';
import { createNotificationRouter } from '@/modules/notification/notification.route';
import { createSettingRouter } from '@/modules/site-setting/site-setting.route';
import { createChatRouter } from '@/modules/chat/chat.route';
import { createOrderRouter } from '@/modules/order/order.route';
import { createShipmentRouter } from '@/modules/order-shipment/order-shipment.route';
import { createJobRouter } from '@/modules/job/job.route';
import { createApplicationRouter } from '@/modules/job-application/job-application.route';

// Admin modules
import { createAdminAuthRouter } from '@/modules/admin-auth/admin-auth.route';
import { createAdminUserRouter } from '@/modules/admin-user/admin-user.route';
import { createUploadRouter } from '@/modules/upload/upload.route';
import { createAdminArticleRouter } from '@/modules/article/artical.route';
import { createAdminCategoryRouter } from '@/modules/category/category.route';
import { createAdminProductRouter } from '@/modules/product/product.route';
import { createAdminReviewRouter } from '@/modules/product-review/product-review.route';
import { createAdminDiscountRouter } from '@/modules/discount/discount.route';
import { createAdminBannerRouter } from '@/modules/banner/banner.route';
import { createAdminPageRouter } from '@/modules/page/page.route';
import { createAdminShippingMethodRouter } from '@/modules/shipping-method/shipping-method.route';
import { createAdminNotificationRouter } from '@/modules/notification/notification.route';
import { createAdminSettingRouter } from '@/modules/site-setting/site-setting.route';
import { createAssistantRouter } from '@/modules/assistant/assistant.route';
import { createAdminOrderRouter } from '@/modules/order/order.route';
import { createAdminShipmentRouter } from '@/modules/order-shipment/order-shipment.route';
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
  // Nested: /api/products/:productId/reviews
  router.use('/products/:productId/reviews', createProductReviewRouter());
  router.use('/cart', createCartRouter());
  router.use('/wishlist', createWishlistRouter());
  router.use('/discounts', createDiscountRouter());
  router.use('/banners', createBannerRouter());
  router.use('/pages', createPageRouter());
  router.use('/shipping-methods', createShippingMethodRouter());
  router.use('/notifications', createNotificationRouter());
  router.use('/settings', createSettingRouter());
  router.use('/chat', createChatRouter());
  router.use('/orders', createOrderRouter());
  // Nested: GET /api/orders/:orderId/shipment
  router.use('/orders/:orderId/shipment', createShipmentRouter());
  router.use('/jobs', createJobRouter());
  // Nested: POST /api/jobs/:jobId/applications
  router.use('/jobs/:jobId/applications', createApplicationRouter());

  // ── Admin routes ─────────────────────────────────────────────
  router.use('/admin/auth', createAdminAuthRouter());
  router.use('/admin/users', createAdminUserRouter());
  router.use('/admin/upload', createUploadRouter());
  router.use('/admin/articles', createAdminArticleRouter());
  router.use('/admin/categories', createAdminCategoryRouter());
  router.use('/admin/products', createAdminProductRouter());
  router.use('/admin/reviews', createAdminReviewRouter());
  router.use('/admin/discounts', createAdminDiscountRouter());
  router.use('/admin/banners', createAdminBannerRouter());
  router.use('/admin/pages', createAdminPageRouter());
  router.use('/admin/shipping-methods', createAdminShippingMethodRouter());
  router.use('/admin/notifications', createAdminNotificationRouter());
  router.use('/admin/settings', createAdminSettingRouter());
  router.use('/admin/assistant', createAssistantRouter());
  router.use('/admin/orders', createAdminOrderRouter());
  // Nested: /api/admin/orders/:orderId/shipment
  router.use('/admin/orders/:orderId/shipment', createAdminShipmentRouter());
  router.use('/admin/jobs', createAdminJobRouter());
  // Nested: /api/admin/jobs/:jobId/applications
  router.use('/admin/jobs/:jobId/applications', createAdminApplicationRouter());

  return router;
}
