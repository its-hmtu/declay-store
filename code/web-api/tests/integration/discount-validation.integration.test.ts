import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for discount validation (W-07 bounds are enforced at creation;
 * this covers the checkout-time validateCode path). Postgres only — no Redis.
 *   RUN_DB_TESTS=true DB_NAME=declay_test npm run test:integration
 */
const RUN = process.env.RUN_DB_TESTS === 'true';

describe.skipIf(!RUN)('discount validateCode [integration]', () => {
  let DiscountService: any, DiscountCode: any, sequelize: any;
  let service: any;
  const code = `TEST${Date.now()}`;

  beforeAll(async () => {
    ({ sequelize } = await import('@/config/sequelize'));
    DiscountCode = (await import('@/modules/discount/discount.entity')).default;
    DiscountService = (await import('@/modules/discount/discount.service')).default;
    service = new DiscountService();
    await sequelize.authenticate();
    await DiscountCode.create({
      code, type: 'percent', value: 10, minOrderAmount: 50, maxUses: 100, usedCount: 0,
      expiresAt: new Date(Date.now() + 86_400_000), isActive: true,
    });
  });

  afterAll(async () => {
    if (DiscountCode) await DiscountCode.destroy({ where: { code } });
    if (sequelize) await sequelize.close();
  });

  it('applies a valid percent code', async () => {
    const r = await service.validateCode(code, 200);
    expect(r.discountAmount).toBe(20); // 10% of 200
  });

  it('rejects an order below the minimum', async () => {
    await expect(service.validateCode(code, 10)).rejects.toBeTruthy();
  });

  it('rejects an unknown code', async () => {
    await expect(service.validateCode('NOPE-DOES-NOT-EXIST', 100)).rejects.toBeTruthy();
  });
});
