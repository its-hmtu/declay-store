import type { RequestHandler } from 'express';
import type { MarginWarning } from './campaign.margin';

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
  /** M-44: member product ids, empty unless the campaign is currently running. */
  getActiveProductIds(campaignId: number): Promise<number[]>;
  /** M-41: same lookup, keeping which campaign won so order lines can be attributed. */
  getWinningCampaigns(productIds: number[]): Promise<Map<number, WinningCampaign>>;
  /** M-41: active campaigns already covering these products in an overlapping window. */
  findOverlapping(
    productIds: number[],
    startsAt: Date | null,
    endsAt: Date | null,
    excludeCampaignId?: number,
  ): Promise<CampaignOverlap[]>;
  /** M-41: dry-run margin + overlap impact before saving. */
  previewImpact(input: IPreviewImpactInput): Promise<ICampaignImpact>;
}

export interface WinningCampaign {
  campaignId: number;
  name: string;
  discountPercent: number;
}

export interface CampaignOverlap {
  productId: number;
  campaignId: number;
  name: string;
  discountPercent: number;
}

export interface IPreviewImpactInput {
  productIds: number[];
  discountPercent: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  excludeCampaignId?: number;
}

export interface ICampaignImpact {
  warnings: MarginWarning[];
  summary: { belowCost: number; thinMargin: number; worstMarginPercent: number | null };
  overlaps: CampaignOverlap[];
  variantsWithoutCost: number;
}

export interface ICampaignController {
  list: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
  adminPreviewImpact: RequestHandler;
}
