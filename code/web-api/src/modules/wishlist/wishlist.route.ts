import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { routeProtect } from '@/middlewares/auth.middleware';
import WishlistService from './wishlist.service';
import WishlistController from './wishlist.controller';
import { addWishlistItemSchema, wishlistItemIdSchema } from './wishlist.validate';

export function createWishlistRouter(): Router {
  const router = Router();
  const controller = new WishlistController(new WishlistService());

  router.use(routeProtect);

  router.get('/', controller.getWishlist);
  router.post('/items', validate(addWishlistItemSchema), controller.addItem);
  router.delete('/items/:itemId', validate(wishlistItemIdSchema, 'params'), controller.removeItem);
  router.delete('/', controller.clearWishlist);

  return router;
}
