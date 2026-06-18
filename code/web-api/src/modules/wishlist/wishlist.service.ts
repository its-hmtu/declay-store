import { Wishlist, WishlistItem } from './wishlist.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import type { IWishlist, IWishlistService } from './wishlist.interface';

export default class WishlistService implements IWishlistService {
  private async findOrCreateWishlist(userId: number): Promise<Wishlist> {
    const [wishlist] = await Wishlist.findOrCreate({ where: { userId } });
    return wishlist;
  }

  async getWishlist(userId: number): Promise<IWishlist> {
    const wishlist = await this.findOrCreateWishlist(userId);

    const wishlistWithItems = await Wishlist.findByPk(wishlist.id, {
      include: [
        {
          model: WishlistItem,
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

    return wishlistWithItems!.toJSON() as unknown as IWishlist;
  }

  async addItem(userId: number, variantId: number): Promise<IWishlist> {
    const variant = await ProductVariant.findByPk(variantId);
    if (!variant || !variant.isActive) throw httpError(404, 'Product variant not found');

    const wishlist = await this.findOrCreateWishlist(userId);

    const existingItem = await WishlistItem.findOne({ where: { wishlistId: wishlist.id, variantId } });
    if (!existingItem) {
      await WishlistItem.create({ wishlistId: wishlist.id, variantId });
    }

    return this.getWishlist(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<IWishlist> {
    const wishlist = await this.findOrCreateWishlist(userId);
    const item = await WishlistItem.findOne({ where: { id: itemId, wishlistId: wishlist.id } });
    if (!item) throw httpError(404, 'Wishlist item not found');

    await item.destroy();
    return this.getWishlist(userId);
  }

  async clearWishlist(userId: number): Promise<void> {
    const wishlist = await this.findOrCreateWishlist(userId);
    await WishlistItem.destroy({ where: { wishlistId: wishlist.id } });
  }
}
