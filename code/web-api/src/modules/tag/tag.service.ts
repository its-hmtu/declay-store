import Tag from './tag.entity';
import { httpError } from '@/utils/http-error';
import type { ITag, ITagService, ICreateTagData, IUpdateTagData } from './tag.interface';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default class TagService implements ITagService {
  async list(): Promise<ITag[]> {
    const rows = await Tag.findAll({ order: [['name', 'ASC']] });
    return rows.map((r) => r.toJSON() as ITag);
  }

  async findById(id: number): Promise<ITag> {
    const tag = await Tag.findByPk(id);
    if (!tag) throw httpError(404, 'Tag not found');
    return tag.toJSON() as ITag;
  }

  async create(data: ICreateTagData): Promise<ITag> {
    const slug = data.slug || slugify(data.name);
    if (!slug) throw httpError(400, 'A valid name or slug is required');
    const existing = await Tag.findOne({ where: { slug } });
    if (existing) throw httpError(409, 'A tag with this slug already exists');
    const tag = await Tag.create({ name: data.name, slug });
    return tag.toJSON() as ITag;
  }

  async update(id: number, data: IUpdateTagData): Promise<ITag> {
    const tag = await Tag.findByPk(id);
    if (!tag) throw httpError(404, 'Tag not found');
    if (data.slug && data.slug !== tag.slug) {
      const conflict = await Tag.findOne({ where: { slug: data.slug } });
      if (conflict) throw httpError(409, 'A tag with this slug already exists');
    }
    await tag.update(data);
    return tag.toJSON() as ITag;
  }

  async remove(id: number): Promise<void> {
    const tag = await Tag.findByPk(id);
    if (!tag) throw httpError(404, 'Tag not found');
    await tag.destroy();
  }
}
