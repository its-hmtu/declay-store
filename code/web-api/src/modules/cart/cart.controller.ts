import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ICartController, ICartService } from './cart.interface';
import { resolveCartOwner, type CartOwner } from './cart.owner';

export default class CartController implements ICartController {
  constructor(private cartService: ICartService) {}

  /** M-01: the cart belongs to the logged-in user, or to a guest session header. */
  private getOwner(req: Request): CartOwner {
    const user = req.user as { userId?: number } | undefined;
    const sessionId = req.header('X-Guest-Session');
    const owner = resolveCartOwner(user?.userId ?? null, sessionId ?? null);
    if (!owner) throw httpError(401, 'Sign in or provide a guest session to use the cart');
    return owner;
  }

  getCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await this.cartService.getCart(this.getOwner(req));
    sendSuccess(res, cart, 'Cart retrieved successfully');
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const { variantId, quantity } = req.body;
    const cart = await this.cartService.addItem(this.getOwner(req), variantId, quantity);
    sendSuccess(res, cart, 'Item added to cart');
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const { quantity } = req.body;
    const cart = await this.cartService.updateItem(
      this.getOwner(req),
      Number(req.params.itemId),
      quantity,
    );
    sendSuccess(res, cart, 'Cart item updated');
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const cart = await this.cartService.removeItem(this.getOwner(req), Number(req.params.itemId));
    sendSuccess(res, cart, 'Item removed from cart');
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    await this.cartService.clearCart(this.getOwner(req));
    sendSuccess(res, null, 'Cart cleared');
  });
}
