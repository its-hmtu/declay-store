import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { optionalAuth } from '@/middlewares/auth.middleware';
import { chatLimiter } from '@/middlewares/rate-limit.middleware';
import ChatService from './chat.service';
import ChatController from './chat.controller';
import { chatMessageSchema } from './chat.validate';

// Public storefront chatbot (read-only). Guests allowed; auth unlocks order lookups.
export function createChatRouter(): Router {
  const router = Router();
  const controller = new ChatController(new ChatService());

  router.post('/', chatLimiter, optionalAuth, validate(chatMessageSchema), controller.message);

  return router;
}
