import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import PageService from './page.service';
import PageController from './page.controller';
import { createPageSchema, updatePageSchema, pageIdSchema, pageSlugSchema } from './page.validate';

// Public: GET /api/pages/:slug (published only)
export function createPageRouter(): Router {
  const router = Router();
  const controller = new PageController(new PageService());
  router.get('/:slug', validate(pageSlugSchema, 'params'), controller.getBySlug);
  return router;
}

// Admin: /api/admin/pages — legal/static content, admin & super_admin only
export function createAdminPageRouter(): Router {
  const router = Router();
  const controller = new PageController(new PageService());
  router.use(adminProtect, requireRole('admin', 'super_admin'));
  router.get('/', controller.adminList);
  router.get('/:id', validate(pageIdSchema, 'params'), controller.adminFindById);
  router.get('/:id/versions', validate(pageIdSchema, 'params'), controller.adminVersions);
  router.post('/', validate(createPageSchema), controller.adminCreate);
  router.put('/:id', validate(pageIdSchema, 'params'), validate(updatePageSchema), controller.adminUpdate);
  router.delete('/:id', validate(pageIdSchema, 'params'), controller.adminRemove);
  return router;
}
