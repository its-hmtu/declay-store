import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import TagService from './tag.service';
import TagController from './tag.controller';
import { createTagSchema, updateTagSchema, tagIdSchema } from './tag.validate';

// Public: GET /api/tags
export function createTagRouter(): Router {
  const router = Router();
  const controller = new TagController(new TagService());
  router.get('/', controller.list);
  return router;
}

// Admin: /api/admin/tags (content taxonomy — all admin roles)
export function createAdminTagRouter(): Router {
  const router = Router();
  const controller = new TagController(new TagService());
  router.use(adminProtect);
  router.get('/', controller.adminList);
  router.post('/', validate(createTagSchema), controller.adminCreate);
  router.put('/:id', validate(tagIdSchema, 'params'), validate(updateTagSchema), controller.adminUpdate);
  router.delete('/:id', validate(tagIdSchema, 'params'), controller.adminRemove);
  return router;
}
