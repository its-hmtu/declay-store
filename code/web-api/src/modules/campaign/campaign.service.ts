import { Op } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Campaign, CampaignProduct } from './campaign.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import Product from '@/modules/product/product.entity';
import {
  checkCampaignMargins, summariseMarginWarnings,
  type MarginWarning, type VariantCost,
} from './campaign.margin';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import { httpError } from '@/utils/http-error';
import type {
  ICampaign, ICampaignService, ICreateCampaignData, IUpdateCampaignData,
} from './campaign.interface';

/**
 * M-41: a campaign edit changes PRODUCT prices, and product/collection responses
 * are cached. Without this the storefront kept serving pre-campaign prices for up
 * to the TTL while the order endpoint charged the new ones — display and checkout
 * disagreeing, which is exactly what the pricing rewrite set out to stop.
 */
async function invalidatePricingCaches(): Promise<void> {
  await invalidateCache(`${cacheKey.PRODUCT_LIST}*`);
  await invalidateCache(`${cacheKey.PRODUCT_DETAIL}*`);
  await invalidateCache(`${cacheKey.COLLECTION_LIST}*`);
  await invalidateCache(`${cacheKey.COLLECTION_DETAIL}*`);
  await invalidateCache(`${cacheKey.CAMPAIGN_LIST}*`);
}

export interface WinningCampaign {
  campaignId: number;
  name: string;
  discountPercent: number;
  /** M-44: drives the storefront countdown. Null = open-ended, render no deadline. */
  endsAt: Date | null;
}

function activeWindow(now: Date) {
  return {
    isActive: true,
    [Op.and]: [
      { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
      { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
    ],
  };
}

export default class CampaignService implements ICampaignService {
  private async toDTO(campaign: Campaign): Promise<ICampaign> {
    const links = await CampaignProduct.findAll({ where: { campaignId: campaign.id }, attributes: ['productId'] });
    return { ...(campaign.toJSON() as ICampaign), productIds: links.map((l) => l.productId) };
  }

  async listActive(): Promise<ICampaign[]> {
    const rows = await Campaign.findAll({ where: activeWindow(new Date()), order: [['createdAt', 'DESC']] });
    return Promise.all(rows.map((r) => this.toDTO(r)));
  }

  /**
   * M-44: product ids in a campaign, but only while that campaign is inside its
   * active window. Returns [] for a paused, expired or unknown campaign so a
   * stale marketing link degrades to "no products" instead of leaking a discount
   * list the shop is no longer honouring.
   */
  async getActiveProductIds(campaignId: number): Promise<number[]> {
    const campaign = await Campaign.findOne({
      where: { id: campaignId, ...activeWindow(new Date()) },
      attributes: ['id'],
    });
    if (!campaign) return [];

    const links = await CampaignProduct.findAll({ where: { campaignId }, attributes: ['productId'] });
    return links.map((l) => l.productId);
  }

  async listAll(): Promise<ICampaign[]> {
    const rows = await Campaign.findAll({ order: [['createdAt', 'DESC']] });
    return Promise.all(rows.map((r) => this.toDTO(r)));
  }

  async findById(id: number): Promise<ICampaign> {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) throw httpError(404, 'Campaign not found');
    return this.toDTO(campaign);
  }

  async create(data: ICreateCampaignData, adminId: number): Promise<ICampaign> {
    const campaign = await sequelize.transaction(async (t) => {
      const c = await Campaign.create(
        {
          name: data.name,
          description: data.description ?? null,
          discountPercent: data.discountPercent,
          startsAt: data.startsAt ?? null,
          endsAt: data.endsAt ?? null,
          isActive: data.isActive ?? true,
          createdBy: adminId,
        },
        { transaction: t },
      );
      if (data.productIds?.length) {
        await CampaignProduct.bulkCreate(
          data.productIds.map((productId) => ({ campaignId: c.id, productId })),
          { transaction: t, ignoreDuplicates: true },
        );
      }
      return c;
    });
    await invalidatePricingCaches();
    return this.findById(campaign.id);
  }

  async update(id: number, data: IUpdateCampaignData): Promise<ICampaign> {
    await sequelize.transaction(async (t) => {
      const campaign = await Campaign.findByPk(id, { transaction: t });
      if (!campaign) throw httpError(404, 'Campaign not found');
      await campaign.update(data, { transaction: t });
      if (data.productIds) {
        await CampaignProduct.destroy({ where: { campaignId: id }, transaction: t });
        if (data.productIds.length) {
          await CampaignProduct.bulkCreate(
            data.productIds.map((productId) => ({ campaignId: id, productId })),
            { transaction: t, ignoreDuplicates: true },
          );
        }
      }
    });
    await invalidatePricingCaches();
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) throw httpError(404, 'Campaign not found');
    await campaign.destroy();
    await invalidatePricingCaches();
  }

  /**
   * M-41: what a proposed campaign would do to margins and to campaigns already
   * running. Read-only — the admin UI calls this before saving. Warnings never
   * block the save; blocking is a product decision the shop owner makes, not us.
   */
  async previewImpact(input: {
    productIds: number[];
    discountPercent: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
    excludeCampaignId?: number;
  }): Promise<{
    warnings: MarginWarning[];
    summary: ReturnType<typeof summariseMarginWarnings>;
    overlaps: Array<{ productId: number; campaignId: number; name: string; discountPercent: number }>;
    variantsWithoutCost: number;
  }> {
    const { productIds, discountPercent } = input;
    if (!productIds.length) {
      return { warnings: [], summary: summariseMarginWarnings([]), overlaps: [], variantsWithoutCost: 0 };
    }

    const variants = (await ProductVariant.findAll({
      where: { productId: { [Op.in]: productIds }, isActive: true },
      attributes: ['id', 'productId', 'name', 'price', 'specialPrice', 'costPrice'],
      include: [{ model: Product, as: 'product', attributes: ['name'] }],
      raw: true,
      nest: true,
    })) as unknown as Array<{
      id: number; productId: number; name: string;
      price: string; specialPrice: string | null; costPrice: string | null;
      product?: { name?: string };
    }>;

    const costed: VariantCost[] = variants.map((v) => ({
      variantId: v.id,
      productId: v.productId,
      productName: v.product?.name ?? '',
      variantName: v.name,
      price: v.price,
      specialPrice: v.specialPrice,
      costPrice: v.costPrice,
    }));

    const warnings = checkCampaignMargins(costed, discountPercent);

    return {
      warnings,
      summary: summariseMarginWarnings(warnings),
      overlaps: await this.findOverlapping(
        productIds,
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.excludeCampaignId,
      ),
      // Cost data is optional, so tell the admin how much of the catalogue we could not judge.
      variantsWithoutCost: costed.filter((v) => v.costPrice == null).length,
    };
  }

  async getActiveDiscountPercents(productIds: number[]): Promise<Map<number, number>> {
    const winners = await this.getWinningCampaigns(productIds);
    return new Map([...winners].map(([productId, w]) => [productId, w.discountPercent]));
  }

  /**
   * M-41: same lookup as getActiveDiscountPercents, but keeps WHICH campaign won.
   * Order lines need the identity, not just the number, so revenue can be
   * attributed afterwards. When several active campaigns cover one product the
   * deepest discount wins (ties resolve to the lower id — deterministic, so two
   * reads of the same cart never disagree).
   */
  async getWinningCampaigns(productIds: number[]): Promise<Map<number, WinningCampaign>> {
    const map = new Map<number, WinningCampaign>();
    if (!productIds.length) return map;

    const links = await CampaignProduct.findAll({
      where: { productId: { [Op.in]: productIds } },
      include: [{
        model: Campaign,
        as: 'campaign',
        required: true,
        attributes: ['id', 'name', 'discountPercent', 'endsAt'],
        where: activeWindow(new Date()),
      }],
    });

    for (const link of links) {
      const campaign = (link as unknown as {
        campaign: { id: number; name: string; discountPercent: number; endsAt: Date | null };
      }).campaign;
      const pct = Number(campaign.discountPercent);
      const current = map.get(link.productId);
      const wins = !current || pct > current.discountPercent
        || (pct === current.discountPercent && campaign.id < current.campaignId);
      if (wins) {
        map.set(link.productId, {
          campaignId: campaign.id,
          name: campaign.name,
          discountPercent: pct,
          endsAt: campaign.endsAt ?? null,
        });
      }
    }
    return map;
  }

  /**
   * M-41: products already covered by an active campaign overlapping [startsAt, endsAt].
   * Used to warn the admin before a second campaign silently shadows the first.
   */
  async findOverlapping(
    productIds: number[],
    startsAt: Date | null,
    endsAt: Date | null,
    excludeCampaignId?: number,
  ): Promise<Array<{ productId: number; campaignId: number; name: string; discountPercent: number }>> {
    if (!productIds.length) return [];

    // Two windows overlap unless one ends before the other starts. NULL = open-ended.
    const overlaps = {
      isActive: true,
      [Op.and]: [
        endsAt ? { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: endsAt } }] } : {},
        startsAt ? { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: startsAt } }] } : {},
        excludeCampaignId ? { id: { [Op.ne]: excludeCampaignId } } : {},
      ],
    };

    const links = await CampaignProduct.findAll({
      where: { productId: { [Op.in]: productIds } },
      include: [{
        model: Campaign,
        as: 'campaign',
        required: true,
        attributes: ['id', 'name', 'discountPercent'],
        where: overlaps,
      }],
    });

    return links.map((link) => {
      const c = (link as unknown as { campaign: { id: number; name: string; discountPercent: number } }).campaign;
      return { productId: link.productId, campaignId: c.id, name: c.name, discountPercent: Number(c.discountPercent) };
    });
  }
}
