import type { RequestHandler } from 'express';

export interface ISiteSetting {
  key: string;
  value: string | null;
  updatedAt: Date;
  updatedBy: number | null;
}

// Storefront shape: prefix-stripped key/value map
export type IPublicSettings = Record<string, string | null>;

export interface ISiteSettingService {
  getPublicSettings(): Promise<IPublicSettings>;
  listAll(): Promise<ISiteSetting[]>;
  get(key: string): Promise<ISiteSetting>;
  upsert(key: string, value: string | null, adminId: number): Promise<ISiteSetting>;
  bulkUpsert(settings: Record<string, string | null>, adminId: number): Promise<ISiteSetting[]>;
  remove(key: string): Promise<void>;
}

export interface ISiteSettingController {
  getPublic: RequestHandler;
  adminList: RequestHandler;
  adminGet: RequestHandler;
  adminUpsert: RequestHandler;
  adminBulkUpsert: RequestHandler;
  adminRemove: RequestHandler;
}
