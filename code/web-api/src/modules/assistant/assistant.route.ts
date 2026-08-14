import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import { assistantLimiter } from '@/middlewares/rate-limit.middleware';
import AssistantService from './assistant.service';
import AssistantController from './assistant.controller';
import { assistantMessageSchema, confirmActionSchema } from './assistant.validate';

// Admin AI assistant (write-enabled, tool use). Destructive actions need confirmation.
export function createAssistantRouter(): Router {
  const router = Router();
  const controller = new AssistantController(new AssistantService());

  router.use(adminProtect, requireRole('admin', 'super_admin'));
  router.use(assistantLimiter);

  router.post('/', validate(assistantMessageSchema), controller.message);
  router.post('/confirm', validate(confirmActionSchema), controller.confirm);

  return router;
}
