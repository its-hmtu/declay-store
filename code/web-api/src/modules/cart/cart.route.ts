import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { optionalAuth } from '@/middlewares/auth.middleware';
import CartService from './cart.service';
import CartController from './cart.controller';
import { addCartItemSchema, updateCartItemSchema, cartItemIdSchema } from './cart.validate';

export function createCartRouter(): Router {
  const router = Router();
  const controller = new CartController(new CartService());

  // M-01: guests may use the cart via X-Guest-Session; logged-in users via Bearer token.
  router.use(optionalAuth);

  router.get('/', controller.getCart);
  router.post('/items', validate(addCartItemSchema), controller.addItem);
  router.put('/items/:itemId', validate(cartItemIdSchema, 'params'), validate(updateCartItemSchema), controller.updateItem);
  router.delete('/items/:itemId', validate(cartItemIdSchema, 'params'), controller.removeItem);
  router.delete('/', controller.clearCart);

  return router;
}
