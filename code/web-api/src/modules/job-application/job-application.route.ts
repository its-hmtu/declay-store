import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect } from '@/middlewares/admin.middleware';
import JobApplicationService from './job-application.service';
import JobApplicationController from './job-application.controller';
import {
  submitApplicationSchema,
  updateApplicationStatusSchema,
  applicationIdSchema,
  jobIdParamSchema,
} from './job-application.validate';

// Public: POST /api/jobs/:jobId/applications
export function createApplicationRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new JobApplicationController(new JobApplicationService());

  router.post('/', validate(jobIdParamSchema, 'params'), validate(submitApplicationSchema), controller.submit);

  return router;
}

// Admin: /api/admin/jobs/:jobId/applications + /api/admin/applications/:applicationId
export function createAdminApplicationRouter(): Router {
  const router = Router({ mergeParams: true });
  const controller = new JobApplicationController(new JobApplicationService());

  router.use(adminProtect);

  router.get('/', validate(jobIdParamSchema, 'params'), controller.listByJob);
  router.get('/:applicationId', validate(applicationIdSchema, 'params'), controller.findById);
  router.put(
    '/:applicationId/status',
    validate(applicationIdSchema, 'params'),
    validate(updateApplicationStatusSchema),
    controller.updateStatus,
  );

  return router;
}
