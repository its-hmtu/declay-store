import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IWishlistController, IWishlistService } from './wishlist.interface';

export default class WishlistController implements IWishlistController {
  constructor(private wishlistService: IWishlistService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  getWishlist = asyncHandler(async (req: Request, res: Response) => {
    const wishlist = await this.wishlistService.getWishlist(this.getUserId(req));
    sendSuccess(res, wishlist, 'Wishlist retrieved successfully');
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const { variantId } = req.body;
    const wishlist = await this.wishlistService.addItem(this.getUserId(req), variantId);
    sendSuccess(res, wishlist, 'Item added to wishlist');
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const wishlist = await this.wishlistService.removeItem(this.getUserId(req), Number(req.params.itemId));
    sendSuccess(res, wishlist, 'Item removed from wishlist');
  });

  clearWishlist = asyncHandler(async (req: Request, res: Response) => {
    await this.wishlistService.clearWishlist(this.getUserId(req));
    sendSuccess(res, null, 'Wishlist cleared');
  });
}
