import type { RequestHandler } from 'express';

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
  userId: number;
  items: ICartItem[];
}

export interface ICartService {
  getCart(userId: number): Promise<ICart>;
  addItem(userId: number, variantId: number, quantity: number): Promise<ICart>;
  updateItem(userId: number, itemId: number, quantity: number): Promise<ICart>;
  removeItem(userId: number, itemId: number): Promise<ICart>;
  clearCart(userId: number): Promise<void>;
}

export interface ICartController {
  getCart: RequestHandler;
  addItem: RequestHandler;
  updateItem: RequestHandler;
  removeItem: RequestHandler;
  clearCart: RequestHandler;
}
