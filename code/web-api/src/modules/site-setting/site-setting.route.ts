import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import SiteSettingService from './site-setting.service';
import SiteSettingController from './site-setting.controller';
import {
  settingKeySchema,
  upsertSettingSchema,
  bulkUpsertSettingSchema,
} from './site-setting.validate';

// Public: GET /api/settings
export function createSettingRouter(): Router {
  const router = Router();
  const controller = new SiteSettingController(new SiteSettingService());

  router.get(
    '/',
    cache({ ttl: redisConfigKeys.CACHE_1_HOUR, keyGenerator: () => cacheKey.SITE_SETTINGS }),
    controller.getPublic,
  );

  return router;
}

// Admin: /api/admin/settings
export function createAdminSettingRouter(): Router {
  const router = Router();
  const controller = new SiteSettingController(new SiteSettingService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));

  router.get('/', controller.adminList);
  router.put('/', validate(bulkUpsertSettingSchema), controller.adminBulkUpsert);
  router.get('/:key', validate(settingKeySchema, 'params'), controller.adminGet);
  router.put('/:key', validate(settingKeySchema, 'params'), validate(upsertSettingSchema), controller.adminUpsert);
  router.delete('/:key', validate(settingKeySchema, 'params'), controller.adminRemove);

  return router;
}
