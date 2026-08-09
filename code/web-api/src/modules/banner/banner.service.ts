import { Op } from 'sequelize';
import Banner from './banner.entity';
import { Campaign } from '@/modules/campaign/campaign.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type {
  IBanner,
  IBannerService,
  ICreateBannerData,
  IUpdateBannerData,
} from './banner.interface';

export default class BannerService implements IBannerService {
  // Storefront: only active banners within their scheduling window
  async listActive(): Promise<IBanner[]> {
    const now = new Date();
    const banners = await Banner.findAll({
      where: {
        isActive: true,
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
        ],
      },
      order: [
        ['position', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    return this.withCampaignState(banners.map((b) => b.toJSON() as IBanner));
  }

  /**
   * M-44: a campaign-linked banner is only honest while its campaign is running.
   * Drop the rest — advertising a discount that checkout will not apply is worse
   * than showing no banner at all.
   *
   * Also fills in the destination so admins never hand-type `/products?campaignId=`,
   * and surfaces the campaign name/end time for countdown UI.
   */
  private async withCampaignState(banners: IBanner[]): Promise<IBanner[]> {
    const campaignIds = [...new Set(banners.map((b) => b.campaignId).filter((id): id is number => !!id))];
    if (!campaignIds.length) return banners;

    const now = new Date();
    const active = await Campaign.findAll({
      where: {
        id: { [Op.in]: campaignIds },
        isActive: true,
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
        ],
      },
      attributes: ['id', 'name', 'discountPercent', 'endsAt'],
    });
    const byId = new Map(active.map((c) => [c.id, c]));

    return banners
      .filter((b) => !b.campaignId || byId.has(b.campaignId))
      .map((b) => {
        if (!b.campaignId) return b;
        const campaign = byId.get(b.campaignId)!;
        return {
          ...b,
          linkUrl: b.linkUrl || `/products?campaignId=${campaign.id}`,
          campaignName: campaign.name,
          campaignDiscountPercent: Number(campaign.discountPercent),
          campaignEndsAt: campaign.endsAt,
        };
      });
  }

  async listAll(): Promise<IBanner[]> {
    const banners = await Banner.findAll({
      order: [
        ['position', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    return banners.map((b) => b.toJSON() as IBanner);
  }

  async findById(id: number): Promise<IBanner> {
    const banner = await Banner.findByPk(id);
    if (!banner) throw httpError(404, 'Banner not found');
    return banner.toJSON() as IBanner;
  }

  async create(data: ICreateBannerData, adminId: number): Promise<IBanner> {
    const banner = await Banner.create({ ...data, createdBy: adminId });
    await invalidateCache(`${cacheKey.BANNER_LIST}*`);
    return banner.toJSON() as IBanner;
  }

  async update(id: number, data: IUpdateBannerData): Promise<IBanner> {
    const banner = await Banner.findByPk(id);
    if (!banner) throw httpError(404, 'Banner not found');

    await banner.update(data);
    await invalidateCache(`${cacheKey.BANNER_LIST}*`);
    return banner.toJSON() as IBanner;
  }

  async remove(id: number): Promise<void> {
    const banner = await Banner.findByPk(id);
    if (!banner) throw httpError(404, 'Banner not found');
    await banner.destroy();
    await invalidateCache(`${cacheKey.BANNER_LIST}*`);
  }
}
