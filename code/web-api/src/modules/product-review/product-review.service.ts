import { Op, fn, col } from 'sequelize';
import ProductReview from './product-review.entity';
import Product from '@/modules/product/product.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import User from '@/modules/user/user.entity';
import { Order, OrderItem } from '@/modules/order/order.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache, invalidateCacheKey } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type {
  IProductReview,
  IProductReviewService,
  IReviewListQuery,
  IReviewListResult,
  IReviewSummary,
  ICreateReviewData,
  IUpdateReviewData,
} from './product-review.interface';

// Orders in these states count as a completed purchase for the verified badge
const PURCHASED_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

const authorAttributes = ['id', 'fullName', 'username'];

export interface IRatingSummary {
  average: number;
  count: number;
}

/**
 * Batch rating summary for many products in a single grouped query.
 * Products with no reviews are simply absent from the returned map.
 */
export async function getRatingSummaries(
  productIds: number[],
): Promise<Map<number, IRatingSummary>> {
  const map = new Map<number, IRatingSummary>();
  if (productIds.length === 0) return map;

  const rows = (await ProductReview.findAll({
    where: { productId: { [Op.in]: productIds } },
    attributes: [
      'productId',
      [fn('COUNT', col('rating')), 'count'],
      [fn('AVG', col('rating')), 'average'],
    ],
    group: ['productId'],
    raw: true,
  })) as unknown as Array<{ productId: number; count: string; average: string }>;

  for (const row of rows) {
    map.set(Number(row.productId), {
      average: Math.round(Number(row.average) * 10) / 10,
      count: Number(row.count),
    });
  }

  return map;
}

export default class ProductReviewService implements IProductReviewService {
  private async getSummary(productId: number): Promise<IReviewSummary> {
    const grouped = (await ProductReview.findAll({
      where: { productId },
      attributes: ['rating', [fn('COUNT', col('rating')), 'count']],
      group: ['rating'],
      raw: true,
    })) as unknown as Array<{ rating: number; count: string }>;

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let weightedSum = 0;

    for (const row of grouped) {
      const rating = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      const count = Number(row.count);
      distribution[rating] = count;
      total += count;
      weightedSum += rating * count;
    }

    const average = total === 0 ? 0 : Math.round((weightedSum / total) * 10) / 10;
    return { average, total, distribution };
  }

  private async assertProductExists(productId: number): Promise<void> {
    const product = await Product.findByPk(productId);
    if (!product) throw httpError(404, 'Product not found');
  }

  private async hasPurchased(userId: number, productId: number): Promise<boolean> {
    const variants = await ProductVariant.findAll({ where: { productId }, attributes: ['id'] });
    if (variants.length === 0) return false;

    const variantIds = variants.map((v) => v.id);
    const purchase = await OrderItem.findOne({
      where: { variantId: { [Op.in]: variantIds } },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [],
          where: { userId, status: { [Op.in]: PURCHASED_STATUSES } },
          required: true,
        },
      ],
    });

    return purchase !== null;
  }

  // Reviews change a product's rating summary, which is baked into the cached
  // product list and detail payloads — clear both so they recompute on next read.
  private async invalidateProductCache(productId: number): Promise<void> {
    const product = await Product.findByPk(productId, { attributes: ['slug'] });
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCacheKey(`${cacheKey.PRODUCT_DETAIL}:${productId}`);
    if (product) {
      await invalidateCacheKey(`${cacheKey.PRODUCT_DETAIL}:slug:${product.slug}`);
    }
  }

  async listByProduct(productId: number, query: IReviewListQuery): Promise<IReviewListResult> {
    await this.assertProductExists(productId);

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit ? Math.min(query.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      where: { productId },
      include: [{ model: User, as: 'user', attributes: authorAttributes }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const summary = await this.getSummary(productId);

    return {
      rows: rows.map((r) => r.toJSON() as IProductReview),
      count,
      summary,
    };
  }

  async create(userId: number, productId: number, data: ICreateReviewData): Promise<IProductReview> {
    await this.assertProductExists(productId);

    const existing = await ProductReview.findOne({ where: { userId, productId } });
    if (existing) throw httpError(409, 'You have already reviewed this product');

    if (data.variantId) {
      const variant = await ProductVariant.findOne({ where: { id: data.variantId, productId } });
      if (!variant) throw httpError(400, 'Variant does not belong to this product');
    }

    const isVerifiedPurchase = await this.hasPurchased(userId, productId);
    if (!isVerifiedPurchase) {
      throw httpError(403, 'You can only review a product you have purchased.');
    }

    const review = await ProductReview.create({
      userId,
      productId,
      variantId: data.variantId ?? null,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body ?? null,
      isVerifiedPurchase,
    });

    await this.invalidateProductCache(productId);

    const withAuthor = await ProductReview.findByPk(review.id, {
      include: [{ model: User, as: 'user', attributes: authorAttributes }],
    });

    return withAuthor!.toJSON() as IProductReview;
  }

  async update(userId: number, reviewId: number, data: IUpdateReviewData): Promise<IProductReview> {
    const review = await ProductReview.findByPk(reviewId);
    if (!review) throw httpError(404, 'Review not found');
    if (review.userId !== userId) throw httpError(403, 'You can only edit your own review');

    await review.update({
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
    });

    // Only the rating affects the cached summary; skip invalidation for text-only edits
    if (data.rating !== undefined) {
      await this.invalidateProductCache(review.productId);
    }

    const withAuthor = await ProductReview.findByPk(review.id, {
      include: [{ model: User, as: 'user', attributes: authorAttributes }],
    });

    return withAuthor!.toJSON() as IProductReview;
  }

  async remove(userId: number, reviewId: number): Promise<void> {
    const review = await ProductReview.findByPk(reviewId);
    if (!review) throw httpError(404, 'Review not found');
    if (review.userId !== userId) throw httpError(403, 'You can only delete your own review');

    const { productId } = review;
    await review.destroy();
    await this.invalidateProductCache(productId);
  }

  async adminList(query: IReviewListQuery): Promise<{ rows: IProductReview[]; count: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit ? Math.min(query.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: authorAttributes },
        { model: Product, as: 'product', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { rows: rows.map((r) => r.toJSON() as IProductReview), count };
  }

  async adminRemove(reviewId: number): Promise<void> {
    const review = await ProductReview.findByPk(reviewId);
    if (!review) throw httpError(404, 'Review not found');

    const { productId } = review;
    await review.destroy();
    await this.invalidateProductCache(productId);
  }
}
