import { Cart, CartItem } from './cart.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import type { ICart, ICartService } from './cart.interface';

export default class CartService implements ICartService {
  private async findOrCreateCart(userId: number): Promise<Cart> {
    const [cart] = await Cart.findOrCreate({ where: { userId } });
    return cart;
  }

  async getCart(userId: number): Promise<ICart> {
    const cart = await this.findOrCreateCart(userId);

    const cartWithItems = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: ProductVariant,
              as: 'variant',
              include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug'] }],
            },
          ],
        },
      ],
    });

    return cartWithItems!.toJSON() as unknown as ICart;
  }

  async addItem(userId: number, variantId: number, quantity: number): Promise<ICart> {
    const variant = await ProductVariant.findByPk(variantId);
    if (!variant || !variant.isActive) throw httpError(404, 'Product variant not found');
    if (variant.stock < quantity) throw httpError(400, `Only ${variant.stock} units available`);

    const cart = await this.findOrCreateCart(userId);

    const existingItem = await CartItem.findOne({ where: { cartId: cart.id, variantId } });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (variant.stock < newQty) throw httpError(400, `Only ${variant.stock} units available`);
      await existingItem.update({ quantity: newQty });
    } else {
      await CartItem.create({ cartId: cart.id, variantId, quantity });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number): Promise<ICart> {
    const cart = await this.findOrCreateCart(userId);
    const item = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw httpError(404, 'Cart item not found');

    const variant = await ProductVariant.findByPk(item.variantId);
    if (variant && variant.stock < quantity) {
      throw httpError(400, `Only ${variant.stock} units available`);
    }

    await item.update({ quantity });
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<ICart> {
    const cart = await this.findOrCreateCart(userId);
    const item = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw httpError(404, 'Cart item not found');

    await item.destroy();
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.findOrCreateCart(userId);
    await CartItem.destroy({ where: { cartId: cart.id } });
  }
}
