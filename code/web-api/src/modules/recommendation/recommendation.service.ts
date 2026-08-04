import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { logger } from '@/lib/logger';
import Product from '@/modules/product/product.entity';
import ProductService from '@/modules/product/product.service';
import type { IProductWithVariants } from '@/modules/product/product.interface';
import { ProductCooccurrence, ProductViewEvent, RecommendationEvent } from './recommendation.entity';
import { buildCooccurrence } from './recommendation.cooccurrence';

export type RecoContext = 'cart' | 'detail' | 'post_purchase' | 'home' | 'account';

const CO_MIN_SCORE = Number(process.env.RECO_COOCCURRENCE_MIN) || 2; // P-Q5b: ngưỡng ≥2 đơn

/**
 * M-35: hệ gợi ý rule-based (không ML). Ghép mua-chung → content-based → phổ biến,
 * áp business rule lọc (loại anchor/giỏ/đã mua/hết hàng) + đa dạng danh mục.
 */
export default class RecommendationService {
  private products = new ProductService();

  /** Dựng lại bảng mua-chung từ đơn hàng thật (job nền gọi). */
  async rebuildCooccurrence(): Promise<{ orders: number; pairs: number }> {
    const rows = await sequelize.query<{ order_id: number; product_id: number }>(
      `SELECT o.id AS order_id, pv.product_id
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN product_variants pv ON pv.id = oi.variant_id
        WHERE o.status NOT IN ('pending_payment', 'cancelled')`,
      { type: QueryTypes.SELECT },
    );
    const byOrder = new Map<number, number[]>();
    for (const r of rows) {
      const arr = byOrder.get(r.order_id) ?? [];
      arr.push(r.product_id);
      byOrder.set(r.order_id, arr);
    }
    const pairs = buildCooccurrence([...byOrder.values()], CO_MIN_SCORE);

    await sequelize.transaction(async (t) => {
      await ProductCooccurrence.destroy({ where: {}, truncate: true, transaction: t });
      if (pairs.length > 0) {
        await ProductCooccurrence.bulkCreate(
          pairs.map((p) => ({ productId: p.productId, coProductId: p.coProductId, score: p.score, updatedAt: new Date() })),
          { transaction: t },
        );
      }
    });
    logger.info('Co-occurrence rebuilt', { orders: byOrder.size, pairs: pairs.length });
    return { orders: byOrder.size, pairs: pairs.length };
  }

  /** Ghi sự kiện xem sản phẩm (fire-and-forget). */
  async recordView(input: { productId: number; userId?: number | null; sessionId?: string | null }): Promise<void> {
    try {
      await ProductViewEvent.create({
        productId: input.productId, userId: input.userId ?? null, sessionId: input.sessionId ?? null,
      });
    } catch (err) {
      logger.warn('recordView failed', { error: (err as Error).message });
    }
  }

  async recommend(input: {
    context: RecoContext;
    productIds?: number[];
    userId?: number | null;
    sessionId?: string | null;
    limit?: number;
  }): Promise<IProductWithVariants[]> {
    const limit = input.limit ?? 4;
    let anchors = (input.productIds ?? []).filter((n) => Number.isInteger(n) && n > 0);

    // M-35e: không có mỏ neo tường minh (vd trang chủ) -> dùng SẢN PHẨM VỪA XEM
    // của người này làm mỏ neo ngầm cho gợi ý theo hành vi duyệt.
    if (anchors.length === 0) {
      anchors = await this.recentlyViewedProductIds(input.userId ?? null, input.sessionId ?? null, 5);
    }

    const excluded = new Set<number>(anchors);
    // BR-3: luôn loại hàng khách ĐÃ MUA.
    if (input.userId) (await this.purchasedProductIds(input.userId)).forEach((id) => excluded.add(id));

    const ordered: number[] = [];
    const seen = new Set<number>();
    const push = (ids: number[]) => {
      for (const id of ids) if (!excluded.has(id) && !seen.has(id)) { seen.add(id); ordered.push(id); }
    };

    // 1) Mua chung từ anchors.
    if (anchors.length > 0) {
      const co = await ProductCooccurrence.findAll({
        where: { productId: anchors }, order: [['score', 'DESC']], limit: 50,
      });
      push(co.map((c) => c.coProductId));
    }

    // 2) Content-based: cùng danh mục với anchors.
    if (anchors.length > 0 && ordered.length < limit * 3) {
      const anchorRows = await Product.findAll({ where: { id: anchors }, attributes: ['categoryId'], raw: true });
      const cats = [...new Set(anchorRows.map((r) => (r as unknown as { categoryId: number }).categoryId))];
      if (cats.length > 0) {
        const same = await Product.findAll({
          where: { categoryId: cats, isActive: true }, attributes: ['id'], order: [['views', 'DESC']], limit: 50, raw: true,
        });
        push(same.map((p) => (p as unknown as { id: number }).id));
      }
    }

    // 2.5) Cá nhân hoá (M-35d): sản phẩm phổ biến trong DANH MỤC khách đã mua.
    if (input.userId && ordered.length < limit * 3) {
      const cats = await this.affinityCategoryIds(input.userId);
      if (cats.length > 0) {
        const inCats = await Product.findAll({
          where: { categoryId: cats, isActive: true }, attributes: ['id'], order: [['views', 'DESC']], limit: 50, raw: true,
        });
        push(inCats.map((p) => (p as unknown as { id: number }).id));
      }
    }

    // 3) Fallback: phổ biến (luôn có kết quả khi còn hàng để bán).
    if (ordered.length < limit * 3) {
      const pop = await Product.findAll({
        where: { isActive: true }, attributes: ['id'], order: [['views', 'DESC']], limit: 50, raw: true,
      });
      push(pop.map((p) => (p as unknown as { id: number }).id));
    }

    const products = await this.products.getByIds(ordered);
    // BR-1: còn hàng (sản phẩm ngừng bán đã bị loại ở bước lấy ứng viên).
    const inStock = products.filter((p) => (p.variants ?? []).some((v) => v.stock > 0));
    // BR-4: đa dạng danh mục.
    const result = this.diversify(inStock, limit);
    // Đo lường: ghi impression cho các sản phẩm thực sự được phục vụ (fire-and-forget).
    void this.logImpressions(result.map((p) => p.id), input.context, input.userId ?? null, input.sessionId ?? null);
    return result;
  }

  /** Ghi impression (mỗi sản phẩm gợi ý 1 hàng) — nền tảng tính CTR. */
  private async logImpressions(productIds: number[], context: RecoContext, userId: number | null, sessionId: string | null): Promise<void> {
    if (productIds.length === 0) return;
    try {
      await RecommendationEvent.bulkCreate(
        productIds.map((productId) => ({ kind: 'impression' as const, context, productId, userId, sessionId })),
      );
    } catch (err) {
      logger.warn('logImpressions failed', { error: (err as Error).message });
    }
  }

  /**
   * "Bạn vừa mới xem" — sản phẩm khách đã xem gần đây (user hoặc guest), còn hàng,
   * theo thứ tự mới nhất. Loại các id truyền vào (vd sản phẩm đang xem / trong giỏ).
   */
  async recentlyViewed(input: {
    userId?: number | null;
    sessionId?: string | null;
    limit?: number;
    excludeIds?: number[];
  }): Promise<IProductWithVariants[]> {
    const limit = input.limit ?? 4;
    const ids = await this.recentlyViewedProductIds(input.userId ?? null, input.sessionId ?? null, 40);
    const exclude = new Set(input.excludeIds ?? []);
    const filtered = ids.filter((id) => !exclude.has(id));
    if (filtered.length === 0) return [];
    const products = await this.products.getByIds(filtered); // getByIds giữ nguyên thứ tự.
    const inStock = products.filter((p) => (p.variants ?? []).some((v) => v.stock > 0));
    return inStock.slice(0, limit);
  }

  /** Ghi click vào 1 sản phẩm gợi ý (fire-and-forget). */
  async logClick(input: { productId: number; context: RecoContext; userId?: number | null; sessionId?: string | null }): Promise<void> {
    try {
      await RecommendationEvent.create({
        kind: 'click', context: input.context, productId: input.productId,
        userId: input.userId ?? null, sessionId: input.sessionId ?? null,
      });
    } catch (err) {
      logger.warn('logClick failed', { error: (err as Error).message });
    }
  }

  private diversify(products: IProductWithVariants[], limit: number): IProductWithVariants[] {
    const perCat = new Map<number, number>();
    const out: IProductWithVariants[] = [];
    for (const p of products) {
      if (out.length >= limit) break;
      const cat = p.categoryId ?? 0;
      const n = perCat.get(cat) ?? 0;
      if (n >= 2) continue;
      perCat.set(cat, n + 1);
      out.push(p);
    }
    if (out.length < limit) {
      for (const p of products) {
        if (out.length >= limit) break;
        if (!out.includes(p)) out.push(p);
      }
    }
    return out.slice(0, limit);
  }

  /** M-35e: sản phẩm khách vừa xem (mỏ neo ngầm cho gợi ý theo hành vi duyệt). */
  private async recentlyViewedProductIds(userId: number | null, sessionId: string | null, limit: number): Promise<number[]> {
    if (!userId && !sessionId) return [];
    const or: Record<string, unknown>[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    const events = await ProductViewEvent.findAll({
      where: or.length > 1 ? { [Op.or]: or } : or[0],
      order: [['viewedAt', 'DESC']], limit: 40, attributes: ['productId'], raw: true,
    });
    const uniq: number[] = [];
    for (const e of events) {
      const id = (e as unknown as { productId: number }).productId;
      if (!uniq.includes(id)) uniq.push(id);
      if (uniq.length >= limit) break;
    }
    return uniq;
  }

  /** M-35d: danh mục khách đã mua (tín hiệu sở thích cá nhân hoá). */
  private async affinityCategoryIds(userId: number): Promise<number[]> {
    const purchased = await this.purchasedProductIds(userId);
    if (purchased.length === 0) return [];
    const rows = await Product.findAll({ where: { id: purchased }, attributes: ['categoryId'], raw: true });
    return [...new Set(rows.map((r) => (r as unknown as { categoryId: number }).categoryId))];
  }

  private async purchasedProductIds(userId: number): Promise<number[]> {
    const rows = await sequelize.query<{ product_id: number }>(
      `SELECT DISTINCT pv.product_id
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN product_variants pv ON pv.id = oi.variant_id
        WHERE o.user_id = :userId AND o.status <> 'cancelled'`,
      { type: QueryTypes.SELECT, replacements: { userId } },
    );
    return rows.map((r) => r.product_id);
  }
}
