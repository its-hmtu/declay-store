import ProductVariant from './product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import { deleteFile } from '@/lib/storage';
import type {
  IProductVariant,
  IProductVariantService,
  ICreateVariantData,
  IUpdateVariantData,
} from './product-variant.interface';

export default class ProductVariantService implements IProductVariantService {
  async listByProduct(productId: number): Promise<IProductVariant[]> {
    const product = await Product.findByPk(productId);
    if (!product) throw httpError(404, 'Product not found');

    const variants = await ProductVariant.findAll({
      where: { productId, isActive: true },
      order: [['createdAt', 'ASC']],
    });
    return variants.map((v) => v.toJSON() as IProductVariant);
  }

  async findById(id: number): Promise<IProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw httpError(404, 'Variant not found');
    return variant.toJSON() as IProductVariant;
  }

  async create(data: ICreateVariantData): Promise<IProductVariant> {
    const product = await Product.findByPk(data.productId);
    if (!product) throw httpError(404, 'Product not found');

    const variant = await ProductVariant.create(data);
    await this.invalidateProduct(data.productId);
    return variant.toJSON() as IProductVariant;
  }

  async update(id: number, data: IUpdateVariantData): Promise<IProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw httpError(404, 'Variant not found');

    const oldImages = Array.isArray(variant.images) ? [...variant.images] : [];
    await variant.update(data);

    // Remove images that were dropped in this edit from object storage (avoid orphans).
    if (data.images !== undefined) {
      const newImages = Array.isArray(data.images) ? data.images : [];
      for (const url of oldImages.filter((u) => !newImages.includes(u))) await deleteFile(url);
    }
    await this.invalidateProduct(variant.productId);
    return variant.toJSON() as IProductVariant;
  }

  async delete(id: number): Promise<void> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw httpError(404, 'Variant not found');
    const productId = variant.productId;
    const images = Array.isArray(variant.images) ? [...variant.images] : [];
    await variant.destroy();
    for (const url of images) await deleteFile(url);
    await this.invalidateProduct(productId);
  }

  /**
   * M-47: variant edits change PRICE and STOCK, both of which the shop grid
   * renders. The list route is cached now, so invalidating only the detail page
   * would leave the grid quoting an old price while the product page shows the
   * new one — the display/checkout divergence the pricing rewrite removed.
   */
  private async invalidateProduct(productId: number): Promise<void> {
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${productId}`);
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCache(`${cacheKey.COLLECTION_LIST}*`);
    await invalidateCache(`${cacheKey.COLLECTION_DETAIL}*`);
  }
}
