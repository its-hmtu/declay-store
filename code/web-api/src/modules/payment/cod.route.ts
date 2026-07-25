import { Router } from 'express';
import { z } from 'zod';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import CodService from './cod.service';
import CodController from './cod.controller';

const reconcileSchema = z.object({
  collectedAmount: z.number().min(0),
  note: z.string().max(500).optional(),
});

const paymentIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number).refine((v) => v > 0),
});

// Admin: /api/admin/cod — staff handle the cash, so editors are included here.
export function createAdminCodRouter(): Router {
  const router = Router();
  const controller = new CodController(new CodService());

  router.use(adminProtect, requireRole('editor', 'admin', 'super_admin'));
  router.get('/pending', controller.listPending);
  router.post('/:id/reconcile', validate(paymentIdSchema, 'params'), validate(reconcileSchema), controller.reconcile);

  return router;
}
