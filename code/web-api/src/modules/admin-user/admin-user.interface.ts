import type { RequestHandler } from 'express';
import type { AdminRole } from '@/modules/admin-auth/admin-auth.entity';

export interface IAdminUser {
  id: number;
  email: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateAdminData {
  email: string;
  password: string;
  fullName?: string | null;
  role?: AdminRole;
  isActive?: boolean;
}

export interface IUpdateAdminData {
  fullName?: string | null;
  password?: string;
  role?: AdminRole;
  isActive?: boolean;
}

export interface IAdminUserService {
  list(page: number, limit: number): Promise<{ rows: IAdminUser[]; count: number }>;
  findById(id: number): Promise<IAdminUser>;
  create(data: ICreateAdminData): Promise<IAdminUser>;
  update(id: number, data: IUpdateAdminData, actingAdminId: number): Promise<IAdminUser>;
  remove(id: number, actingAdminId: number): Promise<void>;
}

export interface IAdminUserController {
  list: RequestHandler;
  findById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}
