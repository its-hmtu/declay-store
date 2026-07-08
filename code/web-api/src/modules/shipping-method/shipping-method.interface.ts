import type { RequestHandler } from 'express';
import type { ShippingZone } from './shipping-method.entity';

export interface IShippingMethod {
  id: number;
  name: string;
  description: string | null;
  zone: ShippingZone;
  fee: number;
  freeOver: number | null;
  estimatedDays: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateShippingMethodData {
  name: string;
  description?: string | null;
  zone?: ShippingZone;
  fee: number;
  freeOver?: number | null;
  estimatedDays?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type IUpdateShippingMethodData = Partial<ICreateShippingMethodData>;

export interface IShippingMethodService {
  listActive(): Promise<IShippingMethod[]>;
  listAll(): Promise<IShippingMethod[]>;
  findById(id: number): Promise<IShippingMethod>;
  create(data: ICreateShippingMethodData): Promise<IShippingMethod>;
  update(id: number, data: IUpdateShippingMethodData): Promise<IShippingMethod>;
  remove(id: number): Promise<void>;
}

export interface IShippingMethodController {
  list: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
