import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import { cache } from '@/middlewares/cache.middleware';
import { redisConfigKeys, cacheKey } from '@/config/redis';
import JobService from './job.service';
import JobController from './job.controller';
import { createJobSchema, updateJobSchema, jobIdSchema } from './job.validate';

export function createJobRouter(): Router {
  const router = Router();
  const controller = new JobController(new JobService());

  // Public
  router.get(
    '/',
    cache({ ttl: redisConfigKeys.CACHE_30_MINUTES, keyGenerator: () => `${cacheKey.JOB_LIST}:open` }),
    controller.listOpen,
  );

  router.get(
    '/:id',
    validate(jobIdSchema, 'params'),
    cache({ ttl: redisConfigKeys.CACHE_30_MINUTES, keyGenerator: (req) => `${cacheKey.JOB_DETAIL}:${req.params.id}` }),
    controller.findById,
  );

  return router;
}

export function createAdminJobRouter(): Router {
  const router = Router();
  const controller = new JobController(new JobService());

  router.use(adminProtect);

  router.get('/', controller.listAll);
  router.get('/:id', validate(jobIdSchema, 'params'), controller.findById);
  router.post('/', validate(createJobSchema), controller.create);
  router.put('/:id', validate(jobIdSchema, 'params'), validate(updateJobSchema), controller.update);
  router.delete('/:id', validate(jobIdSchema, 'params'), controller.delete);

  return router;
}
