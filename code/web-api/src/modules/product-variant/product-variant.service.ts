import ProductVariant from './product-variant.entity';
import Product from '@/modules/product/product.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
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
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${data.productId}`);
    return variant.toJSON() as IProductVariant;
  }

  async update(id: number, data: IUpdateVariantData): Promise<IProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw httpError(404, 'Variant not found');

    await variant.update(data);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${variant.productId}`);
    return variant.toJSON() as IProductVariant;
  }

  async delete(id: number): Promise<void> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) throw httpError(404, 'Variant not found');
    const productId = variant.productId;
    await variant.destroy();
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${productId}`);
  }
}
