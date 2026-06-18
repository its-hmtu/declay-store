import type { RequestHandler } from 'express';

export interface IWishlistItem {
  id: number;
  wishlistId: number;
  variantId: number;
  addedAt: Date;
  variant?: {
    id: number;
    name: string;
    price: number;
    stock: number;
    images: string[];
    product?: { id: number; name: string; slug: string };
  };
}

export interface IWishlist {
  id: number;
  userId: number;
  items: IWishlistItem[];
}

export interface IWishlistService {
  getWishlist(userId: number): Promise<IWishlist>;
  addItem(userId: number, variantId: number): Promise<IWishlist>;
  removeItem(userId: number, itemId: number): Promise<IWishlist>;
  clearWishlist(userId: number): Promise<void>;
}

export interface IWishlistController {
  getWishlist: RequestHandler;
  addItem: RequestHandler;
  removeItem: RequestHandler;
  clearWishlist: RequestHandler;
}
