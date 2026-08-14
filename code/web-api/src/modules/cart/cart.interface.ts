import type { RequestHandler } from 'express';
import type { CartOwner } from './cart.owner';

export interface ICartItem {
  id: number;
  cartId: number;
  variantId: number;
  quantity: number;
  variant?: {
    id: number;
    name: string;
    price: number;
    stock: number;
    images: string[];
    product?: { id: number; name: string; slug: string };
  };
}

export interface ICart {
  id: number;
  userId: number | null;
  sessionId?: string | null;
  items: ICartItem[];
}

export interface ICartService {
  getCart(owner: CartOwner): Promise<ICart>;
  addItem(owner: CartOwner, variantId: number, quantity: number): Promise<ICart>;
  updateItem(owner: CartOwner, itemId: number, quantity: number): Promise<ICart>;
  removeItem(owner: CartOwner, itemId: number): Promise<ICart>;
  clearCart(owner: CartOwner): Promise<void>;
}

export interface ICartController {
  getCart: RequestHandler;
  addItem: RequestHandler;
  updateItem: RequestHandler;
  removeItem: RequestHandler;
  clearCart: RequestHandler;
}
