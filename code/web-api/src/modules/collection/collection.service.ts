import { Op } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Collection, CollectionProduct } from './collection.entity';
import Product from '@/modules/product/product.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import { slugify } from '@/modules/tag/tag.service';
import CampaignService from '@/modules/campaign/campaign.service';
import { decorateVariantsPricing } from '@/lib/pricing';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import { httpError } from '@/utils/http-error';
import { PUBLIC_VARIANT_ATTRIBUTES } from '@/modules/product-variant/variant.fields';
import type {
  ICollection, ICollectionService, ICreateCollectionData, IUpdateCollectionData,
} from './collection.interface';
import type { IProduct } from '@/modules/product/product.interface';

export default class CollectionService implements ICollectionService {
  private campaignService = new CampaignService();

  /** Merchandising edits must show up immediately, not after the 10-minute TTL. */
  private async invalidate(slug?: string | null): Promise<void> {
    await invalidateCache(`${cacheKey.COLLECTION_LIST}*`);
    await invalidateCache(slug ? `${cacheKey.COLLECTION_DETAIL}:${slug}` : `${cacheKey.COLLECTION_DETAIL}*`);
  }

  private async productIdsFor(collectionId: number): Promise<number[]> {
    const links = await CollectionProduct.findAll({ where: { collectionId }, attributes: ['productId'] });
    return links.map((l) => l.productId);
  }

  /**
   * Members that a customer can actually see. The detail route filters on
   * `isActive`, so counting raw links here made the listing promise "12 items"
   * and the page deliver 8.
   */
  private async visibleProductCount(collectionId: number): Promise<number> {
    return CollectionProduct.count({
      where: { collectionId },
      include: [{ model: Product, as: 'product', required: true, where: { isActive: true }, attributes: [] }],
    });
  }

  /**
   * M-46: a handful of visible products for the carousel — same shape and same
   * campaign pricing the shop grid uses, so a card looks identical wherever it
   * appears. Newest first: a collection preview should feel current.
   */
  private async previewProducts(collectionId: number, limit: number): Promise<IProduct[]> {
    const links = await CollectionProduct.findAll({ where: { collectionId }, attributes: ['productId'] });
    const ids = links.map((l) => l.productId);
    if (!ids.length) return [];

    const rows = await Product.findAll({
      where: { id: { [Op.in]: ids }, isActive: true },
      order: [['createdAt', 'DESC']],
      limit,
      include: [{ model: ProductVariant, as: 'variants', attributes: PUBLIC_VARIANT_ATTRIBUTES }],
    });

    const products = rows.map((r) => r.toJSON() as IProduct);
    await this.attachCampaignPricing(products);
    return products;
  }

  /** Shared by the carousel preview and the collection detail page. */
  private async attachCampaignPricing(products: IProduct[]): Promise<void> {
    if (!products.length) return;
    const winners = await this.campaignService.getWinningCampaigns(products.map((p) => p.id));
    for (const product of products) {
      const winner = winners.get(product.id);
      product.campaignDiscountPercent = winner?.discountPercent ?? null;
      product.campaignId = winner?.campaignId ?? null;
      product.campaignName = winner?.name ?? null;
      product.campaignEndsAt = winner?.endsAt ?? null;
      decorateVariantsPricing(
        (product as unknown as { variants?: Array<Record<string, unknown>> }).variants,
        product.campaignDiscountPercent,
      );
    }
  }

  private async toDTO(collection: Collection, publicView = false): Promise<ICollection> {
    const productIds = await this.productIdsFor(collection.id);
    return {
      ...(collection.toJSON() as ICollection),
      productIds,
      // Admin manages the full membership; the storefront counts what it will render.
      productCount: publicView ? await this.visibleProductCount(collection.id) : productIds.length,
    };
  }

  async listActive(withProducts?: number): Promise<ICollection[]> {
    const rows = await Collection.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    const dtos = await Promise.all(rows.map((r) => this.toDTO(r, true)));

    if (!withProducts) return dtos;

    // M-46: attach a preview of each collection's products for the carousel.
    const withPreview = await Promise.all(
      dtos.map(async (dto) => ({ ...dto, products: await this.previewProducts(dto.id, withProducts) })),
    );

    // Never advertise an empty collection — a heading with no products under it
    // reads as a broken page, not as a curated group.
    return withPreview.filter((c) => (c.products?.length ?? 0) > 0);
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
          include: [{ model: ProductVariant, as: 'variants', attributes: PUBLIC_VARIANT_ATTRIBUTES }],
        },
      ],
    });
    if (!collection) throw httpError(404, 'Collection not found');
    const json = collection.toJSON() as ICollection;
    const products = (json.products ?? []) as IProduct[];

    // M-40: collection detail previously served raw variant prices — an active
    // campaign was invisible here while it showed on /products. Same rule, one place.
    await this.attachCampaignPricing(products);

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
          imageUrl: data.imageUrl ?? null,
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
    await this.invalidate();
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
    await this.invalidate();
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const collection = await Collection.findByPk(id);
    if (!collection) throw httpError(404, 'Collection not found');
    await collection.destroy();
    await this.invalidate(collection.slug);
  }
}
