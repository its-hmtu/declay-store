import type { RequestHandler } from 'express';

export interface ICampaign {
  id: number;
  name: string;
  description: string | null;
  discountPercent: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  productIds?: number[];
}

export interface ICreateCampaignData {
  name: string;
  description?: string | null;
  discountPercent: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
  productIds?: number[];
}

export type IUpdateCampaignData = Partial<ICreateCampaignData>;

export interface ICampaignService {
  listActive(): Promise<ICampaign[]>;
  listAll(): Promise<ICampaign[]>;
  findById(id: number): Promise<ICampaign>;
  create(data: ICreateCampaignData, adminId: number): Promise<ICampaign>;
  update(id: number, data: IUpdateCampaignData): Promise<ICampaign>;
  remove(id: number): Promise<void>;
  /** Best (deepest) active campaign % per product, for the given product ids. */
  getActiveDiscountPercents(productIds: number[]): Promise<Map<number, number>>;
}

export interface ICampaignController {
  list: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
