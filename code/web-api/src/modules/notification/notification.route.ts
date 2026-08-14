import { Router } from 'express';
import { routeProtect } from '@/middlewares/auth.middleware';
import { adminProtect } from '@/middlewares/admin.middleware';
import NotificationService from './notification.service';
import NotificationController from './notification.controller';

// Customer: /api/notifications
export function createNotificationRouter(): Router {
  const router = Router();
  const c = new NotificationController(new NotificationService());
  router.use(routeProtect);
  router.get('/', c.listMine);
  router.post('/read-all', c.markAllMineRead);
  router.patch('/:id/read', c.markMineRead);
  return router;
}

// Admin: /api/admin/notifications (all admin roles)
export function createAdminNotificationRouter(): Router {
  const router = Router();
  const c = new NotificationController(new NotificationService());
  router.use(adminProtect);
  router.get('/', c.adminList);
  router.post('/read-all', c.adminMarkAllRead);
  router.patch('/:id/read', c.adminMarkRead);
  return router;
}
