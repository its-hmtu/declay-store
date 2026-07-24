import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import CollectionService from './collection.service';
import CollectionController from './collection.controller';
import { createCollectionSchema, updateCollectionSchema, collectionIdSchema } from './collection.validate';

// Public: GET /api/collections and /api/collections/:slug
export function createCollectionRouter(): Router {
  const router = Router();
  const controller = new CollectionController(new CollectionService());
  router.get('/', controller.list);
  router.get('/:slug', controller.detailBySlug);
  return router;
}

// Admin: /api/admin/collections — merchandising, editor and up
export function createAdminCollectionRouter(): Router {
  const router = Router();
  const controller = new CollectionController(new CollectionService());
  router.use(adminProtect, requireRole('editor', 'admin', 'super_admin'));
  router.get('/', controller.adminList);
  router.get('/:id', validate(collectionIdSchema, 'params'), controller.adminFindById);
  router.post('/', validate(createCollectionSchema), controller.adminCreate);
  router.put('/:id', validate(collectionIdSchema, 'params'), validate(updateCollectionSchema), controller.adminUpdate);
  router.delete('/:id', validate(collectionIdSchema, 'params'), controller.adminRemove);
  return router;
}
