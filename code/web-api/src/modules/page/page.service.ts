import { sequelize } from '@/config/sequelize';
import { Page, PageVersion } from './page.entity';
import { httpError } from '@/utils/http-error';
import type {
  IPage, IPageVersion, IPageService, ICreatePageData, IUpdatePageData,
} from './page.interface';

export default class PageService implements IPageService {
  // Public: only published pages are readable by the storefront.
  async getPublicBySlug(slug: string): Promise<IPage> {
    const page = await Page.findOne({ where: { slug, isPublished: true } });
    if (!page) throw httpError(404, 'Page not found');
    return page.toJSON() as IPage;
  }

  async listAll(): Promise<IPage[]> {
    const pages = await Page.findAll({ order: [['slug', 'ASC']] });
    return pages.map((p) => p.toJSON() as IPage);
  }

  async findById(id: number): Promise<IPage> {
    const page = await Page.findByPk(id);
    if (!page) throw httpError(404, 'Page not found');
    return page.toJSON() as IPage;
  }

  async listVersions(pageId: number): Promise<IPageVersion[]> {
    const versions = await PageVersion.findAll({ where: { pageId }, order: [['version', 'DESC']] });
    return versions.map((v) => v.toJSON() as IPageVersion);
  }

  async create(data: ICreatePageData, adminId: number): Promise<IPage> {
    return sequelize.transaction(async (t) => {
      const existing = await Page.findOne({ where: { slug: data.slug }, transaction: t });
      if (existing) throw httpError(409, 'A page with this slug already exists');
      const page = await Page.create(
        {
          slug: data.slug,
          title: data.title,
          body: data.body,
          isPublished: data.isPublished ?? false,
          effectiveDate: data.effectiveDate ?? null,
          version: 1,
          updatedBy: adminId,
        },
        { transaction: t },
      );
      await PageVersion.create(
        {
          pageId: page.id, version: 1, title: page.title, body: page.body,
          effectiveDate: page.effectiveDate, isPublished: page.isPublished, editedBy: adminId,
        },
        { transaction: t },
      );
      return page.toJSON() as IPage;
    });
  }

  async update(id: number, data: IUpdatePageData, adminId: number): Promise<IPage> {
    return sequelize.transaction(async (t) => {
      const page = await Page.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!page) throw httpError(404, 'Page not found');
      const newVersion = page.version + 1;
      // Slug is immutable (it is the public URL) — only content/flags change.
      await page.update({ ...data, version: newVersion, updatedBy: adminId }, { transaction: t });
      await PageVersion.create(
        {
          pageId: page.id, version: newVersion, title: page.title, body: page.body,
          effectiveDate: page.effectiveDate, isPublished: page.isPublished, editedBy: adminId,
        },
        { transaction: t },
      );
      return page.toJSON() as IPage;
    });
  }

  async remove(id: number): Promise<void> {
    const page = await Page.findByPk(id);
    if (!page) throw httpError(404, 'Page not found');
    await page.destroy();
  }
}
