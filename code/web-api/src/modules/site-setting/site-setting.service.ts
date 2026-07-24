import { Op } from 'sequelize';
import SiteSetting from './site-setting.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type {
  ISiteSetting,
  ISiteSettingService,
  IPublicSettings,
} from './site-setting.interface';

// Keys with this prefix are exposed to the storefront (prefix stripped in the response)
const PUBLIC_PREFIX = 'public.';

export default class SiteSettingService implements ISiteSettingService {
  async getPublicSettings(): Promise<IPublicSettings> {
    const rows = await SiteSetting.findAll({
      where: { key: { [Op.like]: `${PUBLIC_PREFIX}%` } },
    });

    const result: IPublicSettings = {};
    for (const row of rows) {
      result[row.key.slice(PUBLIC_PREFIX.length)] = row.value;
    }
    return result;
  }

  async listAll(): Promise<ISiteSetting[]> {
    const rows = await SiteSetting.findAll({ order: [['key', 'ASC']] });
    return rows.map((r) => r.toJSON() as ISiteSetting);
  }

  async get(key: string): Promise<ISiteSetting> {
    const setting = await SiteSetting.findByPk(key);
    if (!setting) throw httpError(404, 'Setting not found');
    return setting.toJSON() as ISiteSetting;
  }

  async upsert(key: string, value: string | null, adminId: number): Promise<ISiteSetting> {
    const [setting] = await SiteSetting.upsert({
      key,
      value,
      updatedBy: adminId,
      updatedAt: new Date(),
    });

    await this.invalidatePublicCache(key);
    return setting.toJSON() as ISiteSetting;
  }

  async bulkUpsert(
    settings: Record<string, string | null>,
    adminId: number,
  ): Promise<ISiteSetting[]> {
    const now = new Date();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updatedBy: adminId,
      updatedAt: now,
    }));

    const saved = await SiteSetting.bulkCreate(rows, {
      updateOnDuplicate: ['value', 'updatedBy', 'updatedAt'],
    });

    // Invalidate once if any affected key is public
    if (Object.keys(settings).some((k) => k.startsWith(PUBLIC_PREFIX))) {
      await invalidateCache(`${cacheKey.SITE_SETTINGS}*`);
    }
    return saved.map((r) => r.toJSON() as ISiteSetting);
  }

  async remove(key: string): Promise<void> {
    const setting = await SiteSetting.findByPk(key);
    if (!setting) throw httpError(404, 'Setting not found');
    await setting.destroy();
    await this.invalidatePublicCache(key);
  }

  // The storefront only caches public settings, so private keys need no invalidation
  private async invalidatePublicCache(key: string): Promise<void> {
    if (key.startsWith(PUBLIC_PREFIX)) {
      await invalidateCache(`${cacheKey.SITE_SETTINGS}*`);
    }
  }
}
