import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { optionalAuth } from '@/middlewares/auth.middleware';
import { adminProtect } from '@/middlewares/admin.middleware';
import { chatLimiter } from '@/middlewares/rate-limit.middleware';
import LiveChatService from './live-chat.service';
import LiveChatController from './live-chat.controller';
import { handoffRequestSchema, liveMessageSchema, sessionIdParamSchema } from './chat.validate';

/**
 * M-42: customer-facing live chat. `optionalAuth` because guests must be able to
 * reach a human — guest checkout is a MUST in the MVP, so gating support behind
 * an account would contradict it.
 */
export function createLiveChatRouter(): Router {
  const router = Router();
  const controller = new LiveChatController(new LiveChatService());

  router.use(optionalAuth);

  router.get('/:sessionId/stream', validate(sessionIdParamSchema, 'params'), controller.customerStream);
  router.get('/:sessionId', validate(sessionIdParamSchema, 'params'), controller.transcript);
  router.post(
    '/:sessionId/handoff',
    chatLimiter,
    validate(sessionIdParamSchema, 'params'),
    validate(handoffRequestSchema),
    controller.requestHandoff,
  );
  router.post(
    '/:sessionId/messages',
    chatLimiter,
    validate(sessionIdParamSchema, 'params'),
    validate(liveMessageSchema),
    controller.customerSend,
  );

  return router;
}

/**
 * Staff inbox. Deliberately `adminProtect` WITHOUT requireRole: answering customer
 * questions is exactly what a staff/editor account is for. Compare with campaigns,
 * which touch pricing and are restricted to admin+.
 */
export function createAdminLiveChatRouter(): Router {
  const router = Router();
  const controller = new LiveChatController(new LiveChatService());

  router.use(adminProtect);

  router.get('/queue', controller.queue);
  router.get('/stream', controller.inboxStream);
  router.post('/heartbeat', controller.heartbeat);
  router.post('/offline', controller.goOffline);

  router.get('/:sessionId/stream', validate(sessionIdParamSchema, 'params'), controller.staffSessionStream);
  router.get('/:sessionId', validate(sessionIdParamSchema, 'params'), controller.staffTranscript);
  router.post('/:sessionId/claim', validate(sessionIdParamSchema, 'params'), controller.claim);
  router.post(
    '/:sessionId/messages',
    validate(sessionIdParamSchema, 'params'),
    validate(liveMessageSchema),
    controller.staffSend,
  );
  router.post('/:sessionId/read', validate(sessionIdParamSchema, 'params'), controller.markRead);
  router.post('/:sessionId/close', validate(sessionIdParamSchema, 'params'), controller.close);

  return router;
}
