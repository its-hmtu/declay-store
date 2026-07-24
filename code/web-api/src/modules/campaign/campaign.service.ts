import { Op } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Campaign, CampaignProduct } from './campaign.entity';
import { httpError } from '@/utils/http-error';
import type {
  ICampaign, ICampaignService, ICreateCampaignData, IUpdateCampaignData,
} from './campaign.interface';

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
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) throw httpError(404, 'Campaign not found');
    await campaign.destroy();
  }

  async getActiveDiscountPercents(productIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (!productIds.length) return map;
    const links = await CampaignProduct.findAll({
      where: { productId: { [Op.in]: productIds } },
      include: [{ model: Campaign, as: 'campaign', required: true, attributes: ['discountPercent'], where: activeWindow(new Date()) }],
    });
    for (const link of links) {
      const pct = Number((link as unknown as { campaign: { discountPercent: number } }).campaign.discountPercent);
      const cur = map.get(link.productId) ?? 0;
      if (pct > cur) map.set(link.productId, pct);
    }
    return map;
  }
}
