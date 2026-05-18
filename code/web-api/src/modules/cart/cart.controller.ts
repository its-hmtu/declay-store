import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ICartController, ICartService } from './cart.interface';

export default class CartController implements ICartController {
  constructor(private cartService: ICartService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  getCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await this.cartService.getCart(this.getUserId(req));
    sendSuccess(res, cart, 'Cart retrieved successfully');
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const { variantId, quantity } = req.body;
    const cart = await this.cartService.addItem(this.getUserId(req), variantId, quantity);
    sendSuccess(res, cart, 'Item added to cart');
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const { quantity } = req.body;
    const cart = await this.cartService.updateItem(
      this.getUserId(req),
      Number(req.params.itemId),
      quantity,
    );
    sendSuccess(res, cart, 'Cart item updated');
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const cart = await this.cartService.removeItem(this.getUserId(req), Number(req.params.itemId));
    sendSuccess(res, cart, 'Item removed from cart');
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    await this.cartService.clearCart(this.getUserId(req));
    sendSuccess(res, null, 'Cart cleared');
  });
}
