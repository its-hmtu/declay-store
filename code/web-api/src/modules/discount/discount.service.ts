import { Op, type Transaction } from 'sequelize';
import DiscountCode from './discount.entity';
import { Cart, CartItem } from '@/modules/cart/cart.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import { httpError } from '@/utils/http-error';
import type {
  IDiscountCode,
  IDiscountService,
  IDiscountValidationResult,
  ICreateDiscountData,
  IUpdateDiscountData,
} from './discount.interface';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export default class DiscountService implements IDiscountService {
  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async validateCode(code: string, orderAmount: number): Promise<IDiscountValidationResult> {
    const discount = await DiscountCode.findOne({ where: { code: this.normalizeCode(code) } });
    if (!discount || !discount.isActive) {
      throw httpError(404, 'Discount code is invalid');
    }

    if (discount.expiresAt && discount.expiresAt.getTime() < Date.now()) {
      throw httpError(400, 'Discount code has expired');
    }

    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      throw httpError(400, 'Discount code has reached its usage limit');
    }

    if (orderAmount < Number(discount.minOrderAmount)) {
      throw httpError(400, `Order must be at least ${discount.minOrderAmount} to use this code`);
    }

    const rawDiscount =
      discount.type === 'percent'
        ? orderAmount * (Number(discount.value) / 100)
        : Number(discount.value);

    // Never discount more than the order is worth
    const discountAmount = round2(Math.min(rawDiscount, orderAmount));

    return {
      discountCodeId: discount.id,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount,
    };
  }

  async previewForCart(
    userId: number,
    code: string,
  ): Promise<IDiscountValidationResult & { orderAmount: number }> {
    const cart = await Cart.findOne({
      where: { userId },
      include: [{ model: CartItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] }],
    });

    const items = ((cart as unknown as { items?: Array<{ quantity: number; variant?: { price: number } }> })?.items) ?? [];
    if (items.length === 0) throw httpError(400, 'Cart is empty');

    const orderAmount = round2(
      items.reduce((sum, item) => sum + Number(item.variant?.price ?? 0) * item.quantity, 0),
    );

    const result = await this.validateCode(code, orderAmount);
    return { ...result, orderAmount };
  }

  async incrementUsage(discountCodeId: number, transaction?: Transaction): Promise<void> {
    await DiscountCode.increment('usedCount', { by: 1, where: { id: discountCodeId }, transaction });
  }

  async decrementUsage(discountCodeId: number, transaction?: Transaction): Promise<void> {
    // Guard against dropping below zero from manual data edits
    await DiscountCode.decrement('usedCount', {
      by: 1,
      where: { id: discountCodeId, usedCount: { [Op.gt]: 0 } },
      transaction,
    });
  }

  async create(data: ICreateDiscountData): Promise<IDiscountCode> {
    const code = this.normalizeCode(data.code);
    const existing = await DiscountCode.findOne({ where: { code } });
    if (existing) throw httpError(409, 'A discount code with this code already exists');

    const discount = await DiscountCode.create({ ...data, code });
    return discount.toJSON() as IDiscountCode;
  }

  async list(page: number, limit: number): Promise<{ rows: IDiscountCode[]; count: number }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await DiscountCode.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { rows: rows.map((d) => d.toJSON() as IDiscountCode), count };
  }

  async findById(id: number): Promise<IDiscountCode> {
    const discount = await DiscountCode.findByPk(id);
    if (!discount) throw httpError(404, 'Discount code not found');
    return discount.toJSON() as IDiscountCode;
  }

  async update(id: number, data: IUpdateDiscountData): Promise<IDiscountCode> {
    const discount = await DiscountCode.findByPk(id);
    if (!discount) throw httpError(404, 'Discount code not found');

    await discount.update(data);
    return discount.toJSON() as IDiscountCode;
  }

  async remove(id: number): Promise<void> {
    const discount = await DiscountCode.findByPk(id);
    if (!discount) throw httpError(404, 'Discount code not found');
    await discount.destroy();
  }
}
