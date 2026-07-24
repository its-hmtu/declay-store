import type { RequestHandler } from 'express';

export interface IBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateBannerData {
  title?: string | null;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
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
