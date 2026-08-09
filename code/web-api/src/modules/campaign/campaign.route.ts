import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';
import CampaignService from './campaign.service';
import CampaignController from './campaign.controller';
import { createCampaignSchema, updateCampaignSchema, campaignIdSchema, previewImpactSchema } from './campaign.validate';

// Public: GET /api/campaigns (active only)
export function createCampaignRouter(): Router {
  const router = Router();
  const controller = new CampaignController(new CampaignService());
  router.get('/', controller.list);
  return router;
}

// Admin: /api/admin/campaigns — pricing action, admin & super_admin only
export function createAdminCampaignRouter(): Router {
  const router = Router();
  const controller = new CampaignController(new CampaignService());
  router.use(adminProtect, requireRole('admin', 'super_admin'));
  router.get('/', controller.adminList);
  // M-41: dry-run before saving — must be declared before '/:id' so it is not
  // swallowed by the id route.
  router.post('/preview-impact', validate(previewImpactSchema), controller.adminPreviewImpact);
  router.get('/:id', validate(campaignIdSchema, 'params'), controller.adminFindById);
  router.post('/', validate(createCampaignSchema), controller.adminCreate);
  router.put('/:id', validate(campaignIdSchema, 'params'), validate(updateCampaignSchema), controller.adminUpdate);
  router.delete('/:id', validate(campaignIdSchema, 'params'), controller.adminRemove);
  return router;
}
