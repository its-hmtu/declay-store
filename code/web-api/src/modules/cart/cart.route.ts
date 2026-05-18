import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect } from '@/middlewares/auth.middleware';
import CartService from './cart.service';
import CartController from './cart.controller';
import { addCartItemSchema, updateCartItemSchema, cartItemIdSchema } from './cart.validate';

export function createCartRouter(): Router {
  const router = Router();
  const controller = new CartController(new CartService());

  router.use(routeProtect);

  router.get('/', controller.getCart);
  router.post('/items', validate(addCartItemSchema), controller.addItem);
  router.put('/items/:itemId', validate(cartItemIdSchema, 'params'), validate(updateCartItemSchema), controller.updateItem);
  router.delete('/items/:itemId', validate(cartItemIdSchema, 'params'), controller.removeItem);
  router.delete('/', controller.clearCart);

  return router;
}
