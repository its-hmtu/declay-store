import { Op, fn, col, literal } from 'sequelize';
import { Order, OrderItem } from '@/modules/order/order.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import { rankSkus, summariseSales, periodStart, type SkuSalesRow, type RankedSku } from './report.metrics';

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
      ],
      include: [{ model: Order, as: 'order', attributes: [], required: true, where: orderWhere }],
      group: [col('OrderItem.variant_id')],
      raw: true,
    })) as unknown as Array<{
      variantId: number; units: string; revenue: string; orders: string;
      productName: string; variantName: string;
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
    }));

    return {
      period,
      from: from ? from.toISOString() : null,
      rows: rankSkus(rows, limit),
      totals: summariseSales(rows),
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
