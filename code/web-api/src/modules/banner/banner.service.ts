import { Op } from 'sequelize';
import Banner from './banner.entity';
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
    return banners.map((b) => b.toJSON() as IBanner);
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
