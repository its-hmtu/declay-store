import Category from './category.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type { ICategory, ICategoryService, ICreateCategoryData, IUpdateCategoryData } from './category.interface';

export default class CategoryService implements ICategoryService {
  async list(): Promise<ICategory[]> {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });
    return categories.map((c) => c.toJSON() as ICategory);
  }

  async findById(id: number): Promise<ICategory> {
    const category = await Category.findByPk(id);
    if (!category) throw httpError(404, 'Category not found');
    return category.toJSON() as ICategory;
  }

  async findBySlug(slug: string): Promise<ICategory> {
    const category = await Category.findOne({ where: { slug } });
    if (!category) throw httpError(404, 'Category not found');
    return category.toJSON() as ICategory;
  }

  async create(data: ICreateCategoryData): Promise<ICategory> {
    const existing = await Category.findOne({ where: { slug: data.slug } });
    if (existing) throw httpError(409, 'A category with this slug already exists');

    const category = await Category.create(data);
    await invalidateCache(`${cacheKey.CATEGORY_LIST}*`);
    return category.toJSON() as ICategory;
  }

  async update(id: number, data: IUpdateCategoryData): Promise<ICategory> {
    const category = await Category.findByPk(id);
    if (!category) throw httpError(404, 'Category not found');

    if (data.slug && data.slug !== category.slug) {
      const conflict = await Category.findOne({ where: { slug: data.slug } });
      if (conflict) throw httpError(409, 'A category with this slug already exists');
    }

    await category.update(data);
    await invalidateCache(`${cacheKey.CATEGORY_LIST}*`);
    await invalidateCache(`${cacheKey.CATEGORY_DETAIL}:${id}`);
    return category.toJSON() as ICategory;
  }

  async delete(id: number): Promise<void> {
    const category = await Category.findByPk(id);
    if (!category) throw httpError(404, 'Category not found');
    await category.destroy();
    await invalidateCache(`${cacheKey.CATEGORY_LIST}*`);
    await invalidateCache(`${cacheKey.CATEGORY_DETAIL}:${id}`);
  }
}
