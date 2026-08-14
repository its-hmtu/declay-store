import type { RequestHandler } from 'express';
import type { Transaction } from 'sequelize';
import type { DiscountType } from './discount.entity';

export interface IDiscountCode {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscountValidationResult {
  discountCodeId: number;
  code: string;
  type: DiscountType;
  value: number;
  discountAmount: number;
}

export interface ICreateDiscountData {
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface IUpdateDiscountData {
  type?: DiscountType;
  value?: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface IDiscountService {
  validateCode(code: string, orderAmount: number): Promise<IDiscountValidationResult>;
  previewForCart(userId: number, code: string): Promise<IDiscountValidationResult & { orderAmount: number }>;
  incrementUsage(discountCodeId: number, transaction?: Transaction): Promise<void>;
  decrementUsage(discountCodeId: number, transaction?: Transaction): Promise<void>;
  create(data: ICreateDiscountData): Promise<IDiscountCode>;
  list(page: number, limit: number): Promise<{ rows: IDiscountCode[]; count: number }>;
  findById(id: number): Promise<IDiscountCode>;
  update(id: number, data: IUpdateDiscountData): Promise<IDiscountCode>;
  remove(id: number): Promise<void>;
}

export interface IDiscountController {
  validate: RequestHandler;
  adminCreate: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
