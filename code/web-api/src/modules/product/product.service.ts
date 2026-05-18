import { Op } from 'sequelize';
import Product from './product.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type {
  IProduct,
  IProductService,
  IProductWithVariants,
  ICreateProductData,
  IUpdateProductData,
  IProductListQuery,
} from './product.interface';

export default class ProductService implements IProductService {
  async list(query: IProductListQuery): Promise<{ rows: IProduct[]; count: number }> {
    const { categoryId, page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return { rows: rows.map((p) => p.toJSON() as IProduct), count };
  }

  async findById(id: number): Promise<IProductWithVariants> {
    // Variants are imported lazily to avoid circular deps at module init time
    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');

    const product = await Product.findByPk(id, {
      include: [{ model: ProductVariant, as: 'variants' }],
    });

    if (!product) throw httpError(404, 'Product not found');
    return product.toJSON() as IProductWithVariants;
  }

  async findBySlug(slug: string): Promise<IProductWithVariants> {
    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');

    const product = await Product.findOne({
      where: { slug, isActive: true },
      include: [{ model: ProductVariant, as: 'variants' }],
    });

    if (!product) throw httpError(404, 'Product not found');
    return product.toJSON() as IProductWithVariants;
  }

  async create(data: ICreateProductData): Promise<IProduct> {
    const existing = await Product.findOne({ where: { slug: data.slug } });
    if (existing) throw httpError(409, 'A product with this slug already exists');

    const product = await Product.create(data);
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    return product.toJSON() as IProduct;
  }

  async update(id: number, data: IUpdateProductData): Promise<IProduct> {
    const product = await Product.findByPk(id);
    if (!product) throw httpError(404, 'Product not found');

    if (data.slug && data.slug !== product.slug) {
      const conflict = await Product.findOne({ where: { slug: data.slug } });
      if (conflict) throw httpError(409, 'A product with this slug already exists');
    }

    await product.update(data);
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${id}`);
    return product.toJSON() as IProduct;
  }

  async delete(id: number): Promise<void> {
    const product = await Product.findByPk(id);
    if (!product) throw httpError(404, 'Product not found');
    await product.destroy();
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${id}`);
  }
}
