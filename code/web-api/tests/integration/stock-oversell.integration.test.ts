import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for the core anti-oversell invariant behind W-02/W-03:
 * the conditional stock decrement `UPDATE ... SET stock = stock - qty WHERE stock >= qty`
 * must let AT MOST ONE of N concurrent buyers win the last unit, and stock must never
 * go negative.
 *
 * Needs a throwaway Postgres only (no Redis, no Stripe). Opt in explicitly:
 *   RUN_DB_TESTS=true DB_HOST=... DB_PORT=... DB_NAME=declay_test DB_USER=... DB_PASSWORD=... \
 *     npm run test:integration
 * Run migrations against that DB first (npm run migrate). See tests/README.md.
 */

const RUN = process.env.RUN_DB_TESTS === 'true';

describe.skipIf(!RUN)('stock oversell guard [integration]', () => {
  let sequelize: any, ProductVariant: any, Product: any, Category: any, Op: any, literal: any;
  let categoryId: number, productId: number, variantId: number;

  beforeAll(async () => {
    // Dynamic imports so the DB-coupled modules never load when the suite is skipped.
    ({ sequelize } = await import('@/config/sequelize'));
    ({ Op, literal } = await import('sequelize'));
    Category = (await import('@/modules/category/category.entity')).default;
    Product = (await import('@/modules/product/product.entity')).default;
    ProductVariant = (await import('@/modules/product-variant/product-variant.entity')).default;

    await sequelize.authenticate();
    const cat = await Category.create({ name: 'test-cat', slug: `test-cat-${Date.now()}`, isActive: true });
    categoryId = cat.id;
    const prod = await Product.create({ categoryId, name: 'test-prod', slug: `test-prod-${Date.now()}`, isActive: true });
    productId = prod.id;
    const v = await ProductVariant.create({ productId, name: 'test-variant', stock: 1, isActive: true });
    variantId = v.id;
  });

  afterAll(async () => {
    if (!ProductVariant) return;
    await ProductVariant.destroy({ where: { id: variantId } });
    await Product.destroy({ where: { id: productId } });
    await Category.destroy({ where: { id: categoryId } });
    await sequelize.close();
  });

  it('lets exactly one of two concurrent buyers take the last unit', async () => {
    const decrement = () =>
      ProductVariant.update(
        { stock: literal('stock - 1') },
        { where: { id: variantId, stock: { [Op.gte]: 1 } } },
      );

    const [a, b] = await Promise.all([decrement(), decrement()]);
    const winners = [a[0], b[0]].filter((affected: number) => affected === 1);

    expect(winners.length).toBe(1); // only one decrement succeeds
    const after = await ProductVariant.findByPk(variantId);
    expect(after.stock).toBe(0); // never negative
  });
});
