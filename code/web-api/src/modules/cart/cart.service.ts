import { Cart, CartItem } from './cart.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import CampaignService from '@/modules/campaign/campaign.service';
import { decorateVariantsPricing } from '@/lib/pricing';
import { httpError } from '@/utils/http-error';
import { PUBLIC_VARIANT_ATTRIBUTES } from '@/modules/product-variant/variant.fields';
import type { ICart, ICartService } from './cart.interface';
import { ownerWhere, type CartOwner } from './cart.owner';

export default class CartService implements ICartService {
  private campaignService = new CampaignService();

  private async findOrCreateCart(owner: CartOwner): Promise<Cart> {
    const [cart] = await Cart.findOrCreate({ where: ownerWhere(owner) });
    return cart;
  }

  async getCart(owner: CartOwner): Promise<ICart> {
    const cart = await this.findOrCreateCart(owner);

    const cartWithItems = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: ProductVariant,
              as: 'variant',
              attributes: PUBLIC_VARIANT_ATTRIBUTES,
              include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug'] }],
            },
          ],
        },
      ],
    });

    const json = cartWithItems!.toJSON() as unknown as ICart;

    // Attach the active campaign % to each item's product so the storefront cart
    // and checkout estimate match the price the order will actually be charged.
    type CartItemShape = {
      variant?: Record<string, unknown> & {
        product?: { id: number; campaignDiscountPercent?: number | null };
      };
    };
    const items = (json as unknown as { items?: CartItemShape[] }).items ?? [];
    const productIds = items
      .map((i) => i.variant?.product?.id)
      .filter((id): id is number => typeof id === 'number');
    if (productIds.length) {
      const campaignPct = await this.campaignService.getActiveDiscountPercents(productIds);
      for (const item of items) {
        const product = item.variant?.product;
        if (product) product.campaignDiscountPercent = campaignPct.get(product.id) ?? null;
      }
    }

    // M-40: decorate every cart variant with the server-computed price so the cart,
    // drawer and checkout summary all read one number instead of recomputing it.
    for (const item of items) {
      if (item.variant) {
        decorateVariantsPricing([item.variant], item.variant.product?.campaignDiscountPercent ?? null);
      }
    }

    return json;
  }

  async addItem(owner: CartOwner, variantId: number, quantity: number): Promise<ICart> {
    const variant = await ProductVariant.findByPk(variantId);
    if (!variant || !variant.isActive) throw httpError(404, 'Product variant not found');
    if (variant.stock < quantity) throw httpError(400, `Only ${variant.stock} units available`);

    const cart = await this.findOrCreateCart(owner);

    const existingItem = await CartItem.findOne({ where: { cartId: cart.id, variantId } });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (variant.stock < newQty) throw httpError(400, `Only ${variant.stock} units available`);
      await existingItem.update({ quantity: newQty });
    } else {
      await CartItem.create({ cartId: cart.id, variantId, quantity });
    }

    return this.getCart(owner);
  }

  async updateItem(owner: CartOwner, itemId: number, quantity: number): Promise<ICart> {
    const cart = await this.findOrCreateCart(owner);
    const item = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw httpError(404, 'Cart item not found');

    const variant = await ProductVariant.findByPk(item.variantId);
    if (variant && variant.stock < quantity) {
      throw httpError(400, `Only ${variant.stock} units available`);
    }

    await item.update({ quantity });
    return this.getCart(owner);
  }

  async removeItem(owner: CartOwner, itemId: number): Promise<ICart> {
    const cart = await this.findOrCreateCart(owner);
    const item = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw httpError(404, 'Cart item not found');

    await item.destroy();
    return this.getCart(owner);
  }

  async clearCart(owner: CartOwner): Promise<void> {
    const cart = await this.findOrCreateCart(owner);
    await CartItem.destroy({ where: { cartId: cart.id } });
  }
}
