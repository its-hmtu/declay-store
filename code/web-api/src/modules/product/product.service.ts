import { Op, fn, col } from 'sequelize';
import Product from './product.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import { OrderItem } from '@/modules/order/order.entity';
import { CollectionProduct } from '@/modules/collection/collection.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { PUBLIC_VARIANT_ATTRIBUTES } from '@/modules/product-variant/variant.fields';
import { canSeeCost } from '@/modules/product-variant/variant.visibility';
import { computeMargin } from '@/modules/product-variant/variant.margin';
import { effectiveUnitPrice } from '@/lib/pricing';
import CampaignService from '@/modules/campaign/campaign.service';
import { cacheKey } from '@/config/redis';
import type {
  IProduct,
  IProductService,
  IProductWithVariants,
  ICreateProductData,
  IUpdateProductData,
  IProductListQuery,
  IRatingSummary,
  ProductSort,
} from './product.interface';

// Orders in these states count as a completed sale for the metrics.
const PURCHASED_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const TRENDING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface Candidate {
  id: number;
  createdAt: Date | string;
  views: number;
}

interface Metrics {
  ratings: Map<number, IRatingSummary>;
  salesAll: Map<number, number>;   // all-time units sold
  recentSales: Map<number, number>; // units sold in the trending window
  minPrice: Map<number, number>;   // lowest active variant price
}

export default class ProductService implements IProductService {
  private campaignService = new CampaignService();

  async list(query: IProductListQuery): Promise<{ rows: IProduct[]; count: number }> {
    const { categoryId, collectionId, minPrice, maxPrice, page = 1, limit = 20, search, sort = 'newest', includeInactive = false } = query;
    const offset = (page - 1) * limit;

    // Storefront sees active products only; admin opts into the full catalogue.
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    // Restrict to products that belong to the requested collection.
    if (collectionId) {
      const links = await CollectionProduct.findAll({ where: { collectionId }, attributes: ['productId'] });
      const memberIds = links.map((l) => l.productId);
      where.id = { [Op.in]: memberIds.length ? memberIds : [-1] };
    }

    // Pull the full candidate set (ids + the columns the sort needs), then rank
    // and paginate in memory. Sorting by computed metrics (sales, rating, price)
    // in SQL would need fragile aggregate joins with pagination; for this store's
    // catalogue size an in-memory rank is simpler and correct.
    const candidates = (await Product.findAll({
      where,
      attributes: ['id', 'createdAt', 'views'],
      raw: true,
    })) as unknown as Candidate[];

    const ids = candidates.map((c) => c.id);
    const metrics = await this.buildMetrics(ids, sort);

    let ranked = [...candidates].sort(this.comparator(sort, metrics));

    // Price filter (Nike-style buckets): keep products whose lowest active variant price is in range.
    if (minPrice != null || maxPrice != null) {
      ranked = ranked.filter((c) => {
        const mp = metrics.minPrice.get(c.id);
        if (mp == null) return false;
        if (minPrice != null && mp < minPrice) return false;
        if (maxPrice != null && mp > maxPrice) return false;
        return true;
      });
    }

    const pageIds = ranked.slice(offset, offset + limit).map((c) => c.id);

    const products = await this.hydrate(pageIds, metrics);
    return { rows: products, count: ranked.length };
  }

  async findById(id: number, viewerRole?: string | null): Promise<IProductWithVariants> {
    // Admin lookup (by id) — does not count as a customer view.
    // M-04: cost price and margin are attached only for admin/super_admin (BR-09).
    return this.findOneWithMetrics({ id }, false, viewerRole);
  }

  async findBySlug(slug: string): Promise<IProductWithVariants> {
    // Public storefront lookup — counts toward the view metric.
    return this.findOneWithMetrics({ slug, isActive: true }, true);
  }

  async create(data: ICreateProductData): Promise<IProduct> {
    const { tagIds, ...attrs } = data;
    const existing = await Product.findOne({ where: { slug: attrs.slug } });
    if (existing) throw httpError(409, 'A product with this slug already exists');

    const product = await Product.create(attrs);
    if (tagIds) await (product as unknown as { setTags: (ids: number[]) => Promise<void> }).setTags(tagIds);
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    return product.toJSON() as IProduct;
  }

  async update(id: number, data: IUpdateProductData): Promise<IProduct> {
    const { tagIds, ...attrs } = data;
    const product = await Product.findByPk(id);
    if (!product) throw httpError(404, 'Product not found');

    if (attrs.slug && attrs.slug !== product.slug) {
      const conflict = await Product.findOne({ where: { slug: attrs.slug } });
      if (conflict) throw httpError(409, 'A product with this slug already exists');
    }

    const previousSlug = product.slug;
    await product.update(attrs);
    if (tagIds) await (product as unknown as { setTags: (ids: number[]) => Promise<void> }).setTags(tagIds);

    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${id}`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:slug:${previousSlug}`);
    if (product.slug !== previousSlug) {
      await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:slug:${product.slug}`);
    }
    return product.toJSON() as IProduct;
  }

  async delete(id: number): Promise<void> {
    const product = await Product.findByPk(id);
    if (!product) throw httpError(404, 'Product not found');

    const { slug } = product;

    // W-21: never hard-delete a product that appears in an order — soft-delete
    // (deactivate) it instead so order history and snapshots stay intact.
    const variants = await ProductVariant.findAll({ where: { productId: id }, attributes: ['id'] });
    const variantIds = variants.map((v) => v.id);
    const inOrder = variantIds.length
      ? await OrderItem.findOne({ where: { variantId: variantIds } })
      : null;

    if (inOrder) {
      await product.update({ isActive: false });
    } else {
      await product.destroy();
    }
    await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:${id}`);
    await invalidateCache(`${cacheKey.PRODUCT_DETAIL}:slug:${slug}`);
  }

  // ── internals ──────────────────────────────────────────────

  private async findOneWithMetrics(
    where: Record<string, unknown>,
    countView: boolean,
    viewerRole?: string | null,
  ): Promise<IProductWithVariants> {
    const withCost = canSeeCost(viewerRole);
    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');
    const { default: Category } = await import('@/modules/category/category.entity');

    const product = await Product.findOne({
      where,
      include: [
        { model: ProductVariant, as: 'variants', ...(withCost ? {} : { attributes: PUBLIC_VARIANT_ATTRIBUTES }) },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ],
    });

    if (!product) throw httpError(404, 'Product not found');

    // Count the view only for public reads. With detail caching this fires on
    // cache-miss only, so the counter tracks unique-ish reads rather than every
    // render — good enough as a popularity signal.
    if (countView) {
      await Product.increment('views', { where: { id: product.id } }).catch(() => undefined);
    }

    const { getRatingSummaries } = await import('@/modules/product-review/product-review.service');
    const ratings = await getRatingSummaries([product.id]);
    const salesCount = await this.getProductSales(product.id);

    const result = product.toJSON() as IProductWithVariants;
    result.rating = ratings.get(product.id) ?? { average: 0, count: 0 };
    result.salesCount = salesCount;
    const detailPct = await this.campaignService.getActiveDiscountPercents([product.id]);
    result.campaignDiscountPercent = detailPct.get(product.id) ?? null;
    if (countView) result.views = (result.views ?? 0) + 1; // reflect the increment we just issued

    // Attach per-variant margin for admins only.
    if (withCost) {
      for (const v of (result.variants ?? []) as Array<Record<string, any>>) {
        const price = effectiveUnitPrice(v.price, v.specialPrice, result.campaignDiscountPercent ?? null);
        const m = computeMargin(price, v.costPrice);
        v.margin = m?.margin ?? null;
        v.marginPercent = m?.marginPercent ?? null;
      }
    }

    return result;
  }

  /** M-35: nạp product (kèm variants/category/metrics) theo danh sách id, giữ thứ tự. */
  async getByIds(orderedIds: number[]): Promise<IProductWithVariants[]> {
    const metrics = await this.buildMetrics(orderedIds, 'newest');
    return (await this.hydrate(orderedIds, metrics)) as unknown as IProductWithVariants[];
  }

  private async hydrate(orderedIds: number[], metrics: Metrics): Promise<IProduct[]> {
    if (orderedIds.length === 0) return [];

    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');
    const { default: Category } = await import('@/modules/category/category.entity');

    const rows = await Product.findAll({
      where: { id: { [Op.in]: orderedIds } },
      include: [
        { model: ProductVariant, as: 'variants', attributes: PUBLIC_VARIANT_ATTRIBUTES },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ],
    });

    const byId = new Map(rows.map((p) => [p.id, p]));
    const campaignPct = await this.campaignService.getActiveDiscountPercents(orderedIds);

    // Preserve the ranked order the IN-query doesn't guarantee.
    return orderedIds.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const product = row.toJSON() as IProduct;
      product.rating = metrics.ratings.get(id) ?? { average: 0, count: 0 };
      product.salesCount = metrics.salesAll.get(id) ?? 0;
      product.campaignDiscountPercent = campaignPct.get(id) ?? null;
      return [product];
    });
  }

  private async buildMetrics(ids: number[], sort: ProductSort): Promise<Metrics> {
    const metrics: Metrics = {
      ratings: new Map(),
      salesAll: new Map(),
      recentSales: new Map(),
      minPrice: new Map(),
    };
    if (ids.length === 0) return metrics;

    const { getRatingSummaries } = await import('@/modules/product-review/product-review.service');
    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');

    metrics.ratings = await getRatingSummaries(ids);

    const variants = (await ProductVariant.findAll({
      where: { productId: { [Op.in]: ids } },
      attributes: ['id', 'productId', 'price', 'isActive'],
      raw: true,
    })) as unknown as Array<{ id: number; productId: number; price: string; isActive: boolean }>;

    const variantToProduct = new Map<number, number>();
    const variantIds: number[] = [];
    for (const v of variants) {
      variantToProduct.set(v.id, v.productId);
      variantIds.push(v.id);
      if (v.isActive) {
        const price = Number(v.price);
        const current = metrics.minPrice.get(v.productId);
        if (current === undefined || price < current) metrics.minPrice.set(v.productId, price);
      }
    }

    // All-time sales feed both the best-sellers rank and the displayed badge.
    const allByVariant = await this.sumSalesByVariant(variantIds);
    for (const [variantId, units] of allByVariant) {
      const productId = variantToProduct.get(variantId);
      if (productId === undefined) continue;
      metrics.salesAll.set(productId, (metrics.salesAll.get(productId) ?? 0) + units);
    }

    if (sort === 'trending') {
      const since = new Date(Date.now() - TRENDING_WINDOW_MS);
      const recentByVariant = await this.sumSalesByVariant(variantIds, since);
      for (const [variantId, units] of recentByVariant) {
        const productId = variantToProduct.get(variantId);
        if (productId === undefined) continue;
        metrics.recentSales.set(productId, (metrics.recentSales.get(productId) ?? 0) + units);
      }
    }

    return metrics;
  }

  private async sumSalesByVariant(variantIds: number[], since?: Date): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (variantIds.length === 0) return map;

    const { Order, OrderItem } = await import('@/modules/order/order.entity');

    const orderWhere: Record<string, unknown> = { status: { [Op.in]: PURCHASED_STATUSES } };
    if (since) orderWhere.createdAt = { [Op.gte]: since };

    const rows = (await OrderItem.findAll({
      attributes: [
        [col('OrderItem.variant_id'), 'variantId'],
        [fn('SUM', col('OrderItem.quantity')), 'units'],
      ],
      where: { variantId: { [Op.in]: variantIds } },
      include: [{ model: Order, as: 'order', attributes: [], required: true, where: orderWhere }],
      group: [col('OrderItem.variant_id')],
      raw: true,
    })) as unknown as Array<{ variantId: number; units: string }>;

    for (const row of rows) map.set(Number(row.variantId), Number(row.units));
    return map;
  }

  private async getProductSales(productId: number): Promise<number> {
    const { default: ProductVariant } = await import('@/modules/product-variant/product-variant.entity');
    const variants = (await ProductVariant.findAll({
      where: { productId },
      attributes: ['id'],
      raw: true,
    })) as unknown as Array<{ id: number }>;

    const byVariant = await this.sumSalesByVariant(variants.map((v) => v.id));
    let total = 0;
    for (const units of byVariant.values()) total += units;
    return total;
  }

  private comparator(sort: ProductSort, m: Metrics): (a: Candidate, b: Candidate) => number {
    const time = (c: Candidate) => new Date(c.createdAt).getTime();
    const newest = (a: Candidate, b: Candidate) => time(b) - time(a);
    const rating = (id: number) => m.ratings.get(id)?.average ?? 0;
    const ratingCount = (id: number) => m.ratings.get(id)?.count ?? 0;
    const sales = (id: number) => m.salesAll.get(id) ?? 0;
    const recent = (id: number) => m.recentSales.get(id) ?? 0;

    const byPrice = (a: Candidate, b: Candidate, dir: 1 | -1) => {
      const pa = m.minPrice.get(a.id);
      const pb = m.minPrice.get(b.id);
      if (pa === undefined && pb === undefined) return newest(a, b);
      if (pa === undefined) return 1; // products without a price rank last
      if (pb === undefined) return -1;
      return (pa - pb) * dir || newest(a, b);
    };

    switch (sort) {
      case 'oldest':
        return (a, b) => time(a) - time(b);
      case 'price-asc':
        return (a, b) => byPrice(a, b, 1);
      case 'price-desc':
        return (a, b) => byPrice(a, b, -1);
      case 'best-sellers':
        return (a, b) => sales(b.id) - sales(a.id) || rating(b.id) - rating(a.id) || newest(a, b);
      case 'top-rated':
        return (a, b) =>
          rating(b.id) - rating(a.id) || ratingCount(b.id) - ratingCount(a.id) || newest(a, b);
      case 'trending':
        return (a, b) => recent(b.id) - recent(a.id) || b.views - a.views || newest(a, b);
      case 'newest':
      default:
        return newest;
    }
  }
}
