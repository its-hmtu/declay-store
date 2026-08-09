import type { RequestHandler } from 'express';

export interface IBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  /** M-44: campaign this banner promotes; the banner hides when it stops running. */
  campaignId?: number | null;
  position: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived on the public list only, for countdown/label UI. */
  campaignName?: string;
  campaignDiscountPercent?: number;
  campaignEndsAt?: Date | null;
}

export interface ICreateBannerData {
  title?: string | null;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  campaignId?: number | null;
  position?: number;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface IUpdateBannerData {
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string;
  linkUrl?: string | null;
  campaignId?: number | null;
  position?: number;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface IBannerService {
  listActive(): Promise<IBanner[]>;
  listAll(): Promise<IBanner[]>;
  findById(id: number): Promise<IBanner>;
  create(data: ICreateBannerData, adminId: number): Promise<IBanner>;
  update(id: number, data: IUpdateBannerData): Promise<IBanner>;
  remove(id: number): Promise<void>;
}

export interface IBannerController {
  list: RequestHandler;
  adminList: RequestHandler;
  adminFindById: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
