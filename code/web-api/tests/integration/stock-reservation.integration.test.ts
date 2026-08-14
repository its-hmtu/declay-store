import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Reservation lifecycle at the SQL level (W-02/W-03): the atomic conditional
 * decrement reserves stock and never goes negative; increment releases it back.
 * Postgres only.
 */
const RUN = process.env.RUN_DB_TESTS === 'true';

describe.skipIf(!RUN)('stock reservation lifecycle [integration]', () => {
  let sequelize: any, ProductVariant: any, Product: any, Category: any, Op: any, literal: any;
  let categoryId: number, productId: number, variantId: number;

  beforeAll(async () => {
    ({ sequelize } = await import('@/config/sequelize'));
    ({ Op, literal } = await import('sequelize'));
    Category = (await import('@/modules/category/category.entity')).default;
    Product = (await import('@/modules/product/product.entity')).default;
    ProductVariant = (await import('@/modules/product-variant/product-variant.entity')).default;
    await sequelize.authenticate();
    const cat = await Category.create({ name: 't', slug: `t-${Date.now()}`, isActive: true });
    categoryId = cat.id;
    const prod = await Product.create({ categoryId, name: 't', slug: `t-${Date.now()}`, isActive: true });
    productId = prod.id;
    const v = await ProductVariant.create({ productId, name: 't', stock: 1, isActive: true });
    variantId = v.id;
  });

  afterAll(async () => {
    if (ProductVariant) await ProductVariant.destroy({ where: { id: variantId } });
    if (Product) await Product.destroy({ where: { id: productId } });
    if (Category) await Category.destroy({ where: { id: categoryId } });
    if (sequelize) await sequelize.close();
  });

  it('reserves once, blocks the second, then releases', async () => {
    const reserve = () => ProductVariant.update(
      { stock: literal('stock - 1') },
      { where: { id: variantId, stock: { [Op.gte]: 1 } } },
    );
    const [a] = await reserve();
    expect(a).toBe(1);
    const [b] = await reserve();
    expect(b).toBe(0); // no stock left — reservation blocked
    expect((await ProductVariant.findByPk(variantId)).stock).toBe(0);

    await ProductVariant.increment('stock', { by: 1, where: { id: variantId } });
    expect((await ProductVariant.findByPk(variantId)).stock).toBe(1);
  });
});
