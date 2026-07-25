import { Router } from 'express';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import ReportService from './report.service';
import ReportController from './report.controller';

// Admin: /api/admin/reports — revenue figures, so admin & super_admin only.
export function createAdminReportRouter(): Router {
  const router = Router();
  const controller = new ReportController(new ReportService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));
  router.get('/top-skus', controller.topSkus);
  router.get('/product-views', controller.productViews);

  return router;
}
