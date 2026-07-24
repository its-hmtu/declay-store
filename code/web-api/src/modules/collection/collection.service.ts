import { sequelize } from '@/config/sequelize';
import { Collection, CollectionProduct } from './collection.entity';
import Product from '@/modules/product/product.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import { slugify } from '@/modules/tag/tag.service';
import { httpError } from '@/utils/http-error';
import type {
  ICollection, ICollectionService, ICreateCollectionData, IUpdateCollectionData,
} from './collection.interface';
import type { IProduct } from '@/modules/product/product.interface';

export default class CollectionService implements ICollectionService {
  private async productIdsFor(collectionId: number): Promise<number[]> {
    const links = await CollectionProduct.findAll({ where: { collectionId }, attributes: ['productId'] });
    return links.map((l) => l.productId);
  }

  private async toDTO(collection: Collection): Promise<ICollection> {
    const productIds = await this.productIdsFor(collection.id);
    return { ...(collection.toJSON() as ICollection), productIds, productCount: productIds.length };
  }

  async listActive(): Promise<ICollection[]> {
    const rows = await Collection.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    return Promise.all(rows.map((r) => this.toDTO(r)));
  }

  async listAll(): Promise<ICollection[]> {
    const rows = await Collection.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    return Promise.all(rows.map((r) => this.toDTO(r)));
  }

  async findById(id: number): Promise<ICollection> {
    const collection = await Collection.findByPk(id);
    if (!collection) throw httpError(404, 'Collection not found');
    return this.toDTO(collection);
  }

  async findBySlug(slug: string): Promise<ICollection> {
    const collection = await Collection.findOne({
      where: { slug, isActive: true },
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: [] },
          where: { isActive: true },
          required: false,
          include: [{ model: ProductVariant, as: 'variants' }],
        },
      ],
    });
    if (!collection) throw httpError(404, 'Collection not found');
    const json = collection.toJSON() as ICollection;
    const products = (json.products ?? []) as IProduct[];
    return { ...json, products, productCount: products.length };
  }

  async create(data: ICreateCollectionData, adminId: number): Promise<ICollection> {
    const slug = data.slug || slugify(data.name);
    if (!slug) throw httpError(400, 'A valid name or slug is required');
    const existing = await Collection.findOne({ where: { slug } });
    if (existing) throw httpError(409, 'A collection with this slug already exists');

    const collection = await sequelize.transaction(async (t) => {
      const c = await Collection.create(
        {
          name: data.name,
          slug,
          description: data.description ?? null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
          createdBy: adminId,
        },
        { transaction: t },
      );
      if (data.productIds?.length) {
        await CollectionProduct.bulkCreate(
          data.productIds.map((productId) => ({ collectionId: c.id, productId })),
          { transaction: t, ignoreDuplicates: true },
        );
      }
      return c;
    });
    return this.findById(collection.id);
  }

  async update(id: number, data: IUpdateCollectionData): Promise<ICollection> {
    await sequelize.transaction(async (t) => {
      const collection = await Collection.findByPk(id, { transaction: t });
      if (!collection) throw httpError(404, 'Collection not found');

      if (data.slug && data.slug !== collection.slug) {
        const conflict = await Collection.findOne({ where: { slug: data.slug }, transaction: t });
        if (conflict) throw httpError(409, 'A collection with this slug already exists');
      }

      const { productIds, ...attrs } = data;
      await collection.update(attrs, { transaction: t });

      if (productIds) {
        await CollectionProduct.destroy({ where: { collectionId: id }, transaction: t });
        if (productIds.length) {
          await CollectionProduct.bulkCreate(
            productIds.map((productId) => ({ collectionId: id, productId })),
            { transaction: t, ignoreDuplicates: true },
          );
        }
      }
    });
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const collection = await Collection.findByPk(id);
    if (!collection) throw httpError(404, 'Collection not found');
    await collection.destroy();
  }
}
