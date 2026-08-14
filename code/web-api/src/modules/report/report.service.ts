import { Op, fn, col, literal, QueryTypes } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Order, OrderItem } from '@/modules/order/order.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import {
  rankSkus, summariseSales, summariseCampaigns, periodStart,
  type SkuSalesRow, type RankedSku, type CampaignPerformanceRow,
} from './report.metrics';

// Orders in these states count as a completed sale (same rule as product metrics).
const PURCHASED_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

export interface TopSkuReport {
  period: string;
  from: string | null;
  rows: RankedSku[];
  totals: { totalUnits: number; totalRevenue: number; skuCount: number };
}

export default class ReportService {
  /**
   * M-05: units sold + revenue per SKU (variant) for the period — the instrument
   * the shop uses to answer "which products sell best".
   */
  async topSkus(period = '30d', limit = 20): Promise<TopSkuReport> {
    const from = periodStart(period);

    const orderWhere: Record<string, unknown> = { status: { [Op.in]: PURCHASED_STATUSES } };
    if (from) orderWhere.createdAt = { [Op.gte]: from };

    const raw = (await OrderItem.findAll({
      attributes: [
        [col('OrderItem.variant_id'), 'variantId'],
        [fn('SUM', col('OrderItem.quantity')), 'units'],
        [fn('SUM', literal('"OrderItem"."quantity" * "OrderItem"."price_at_purchase"')), 'revenue'],
        [fn('COUNT', fn('DISTINCT', col('OrderItem.order_id'))), 'orders'],
        [fn('MAX', col('OrderItem.product_name_at_purchase')), 'productName'],
        [fn('MAX', col('OrderItem.variant_name_at_purchase')), 'variantName'],
        // M-41: split campaign-priced volume out of the headline number.
        [literal('COALESCE(SUM("OrderItem"."quantity") FILTER (WHERE "OrderItem"."campaign_id" IS NOT NULL), 0)'), 'campaignUnits'],
        [literal('COALESCE(SUM("OrderItem"."campaign_discount_amount"), 0)'), 'campaignDiscount'],
      ],
      include: [{ model: Order, as: 'order', attributes: [], required: true, where: orderWhere }],
      group: [col('OrderItem.variant_id')],
      raw: true,
    })) as unknown as Array<{
      variantId: number; units: string; revenue: string; orders: string;
      productName: string; variantName: string;
      campaignUnits: string; campaignDiscount: string;
    }>;

    // Map variants back to their product so the report can link to the product page.
    const variantIds = raw.map((r) => Number(r.variantId));
    const variants = variantIds.length
      ? ((await ProductVariant.findAll({
          where: { id: { [Op.in]: variantIds } },
          attributes: ['id', 'productId'],
          raw: true,
        })) as unknown as Array<{ id: number; productId: number }>)
      : [];
    const productOf = new Map(variants.map((v) => [v.id, v.productId]));

    const rows: SkuSalesRow[] = raw.map((r) => ({
      variantId: Number(r.variantId),
      productId: productOf.get(Number(r.variantId)) ?? 0,
      productName: r.productName ?? '',
      variantName: r.variantName ?? '',
      unitsSold: Number(r.units) || 0,
      revenue: Number(r.revenue) || 0,
      orderCount: Number(r.orders) || 0,
      campaignUnits: Number(r.campaignUnits) || 0,
      campaignDiscount: Number(r.campaignDiscount) || 0,
    }));

    return {
      period,
      from: from ? from.toISOString() : null,
      rows: rankSkus(rows, limit),
      totals: summariseSales(rows),
    };
  }

  /**
   * M-41: revenue attributed to each campaign in the period.
   *
   * Only lines the campaign actually priced are counted (see `attributionOf` in
   * order.service) — a campaign that lost to a cheaper special price is not
   * credited with sales it did not cause.
   */
  async campaignPerformance(period = '30d'): Promise<{
    period: string;
    from: string | null;
    rows: CampaignPerformanceRow[];
    totals: { unitsSold: number; revenue: number; discountGiven: number; discountRate: number };
  }> {
    const from = periodStart(period);

    const raw = (await sequelize.query(
      `SELECT oi.campaign_id                                   AS "campaignId",
              MAX(oi.campaign_name_at_purchase)                AS "campaignName",
              SUM(oi.quantity)                                 AS "unitsSold",
              COUNT(DISTINCT oi.order_id)                      AS "orderCount",
              SUM(oi.quantity * oi.price_at_purchase)          AS "revenue",
              SUM(oi.quantity * COALESCE(oi.base_price_at_purchase, oi.price_at_purchase)) AS "grossRevenue",
              SUM(oi.campaign_discount_amount)                 AS "discountGiven"
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE oi.campaign_id IS NOT NULL
          AND o.status = ANY($statuses)
          AND ($from::timestamptz IS NULL OR o.created_at >= $from)
        GROUP BY oi.campaign_id`,
      {
        bind: { statuses: PURCHASED_STATUSES, from: from ? from.toISOString() : null },
        type: QueryTypes.SELECT,
      },
    )) as unknown as Array<Record<string, string | number | null>>;

    const rows = summariseCampaigns(
      raw.map((r) => ({
        campaignId: r.campaignId == null ? null : Number(r.campaignId),
        campaignName: String(r.campaignName ?? 'Deleted campaign'),
        unitsSold: Number(r.unitsSold) || 0,
        orderCount: Number(r.orderCount) || 0,
        revenue: Number(r.revenue) || 0,
        grossRevenue: Number(r.grossRevenue) || 0,
        discountGiven: Number(r.discountGiven) || 0,
        discountRate: 0, // computed in summariseCampaigns
      })),
    );

    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const grossRevenue = rows.reduce((s, r) => s + r.grossRevenue, 0);
    const discountGiven = rows.reduce((s, r) => s + r.discountGiven, 0);

    return {
      period,
      from: from ? from.toISOString() : null,
      rows,
      totals: {
        unitsSold: rows.reduce((s, r) => s + r.unitsSold, 0),
        revenue: Math.round(revenue * 100) / 100,
        discountGiven: Math.round(discountGiven * 100) / 100,
        discountRate: grossRevenue > 0 ? Math.round((discountGiven / grossRevenue) * 1000) / 10 : 0,
      },
    };
  }

  /**
   * M-35 (đo lường): CTR của gợi ý theo NGỮ CẢNH trong kỳ. CTR = click / impression.
   * Giúp shop biết vị trí gợi ý nào hiệu quả (giỏ / chi tiết / trang chủ / tài khoản).
   */
  async recommendationCtr(period = '30d'): Promise<{
    period: string;
    from: string | null;
    rows: Array<{ context: string; impressions: number; clicks: number; ctr: number }>;
    totals: { impressions: number; clicks: number; ctr: number };
  }> {
    const from = periodStart(period);
    const raw = (await sequelize.query(
      `SELECT context,
              COUNT(*) FILTER (WHERE kind = 'impression') AS impressions,
              COUNT(*) FILTER (WHERE kind = 'click')      AS clicks
         FROM recommendation_events
        WHERE (:from IS NULL OR created_at >= :from)
        GROUP BY context
        ORDER BY impressions DESC`,
      { type: QueryTypes.SELECT, replacements: { from: from ? from.toISOString() : null } },
    )) as Array<{ context: string; impressions: string; clicks: string }>;

    const rows = raw.map((r) => {
      const impressions = Number(r.impressions) || 0;
      const clicks = Number(r.clicks) || 0;
      return { context: r.context, impressions, clicks, ctr: impressions ? clicks / impressions : 0 };
    });
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    return {
      period,
      from: from ? from.toISOString() : null,
      rows,
      totals: { impressions, clicks, ctr: impressions ? clicks / impressions : 0 },
    };
  }

  /** Product-level interest signal: views vs units sold (helps spot poor conversion). */
  async productViews(limit = 20): Promise<Array<{ id: number; name: string; slug: string; views: number }>> {
    const rows = (await Product.findAll({
      attributes: ['id', 'name', 'slug', 'views'],
      order: [['views', 'DESC']],
      limit,
      raw: true,
    })) as unknown as Array<{ id: number; name: string; slug: string; views: number }>;
    return rows;
  }
}
