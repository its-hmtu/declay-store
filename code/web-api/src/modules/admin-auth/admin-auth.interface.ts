import type { RequestHandler } from 'express';
import type { AdminRole } from './admin-auth.entity';

export interface IAdminLoginData {
  email: string;
  password: string;
}

export interface IAdminAuthService {
  login(data: IAdminLoginData): Promise<{ access_token: string; admin: object }>;
  getAdminInfo(adminId: number): Promise<object>;
}

export interface IAdminAuthController {
  login: RequestHandler;
  getAdminInfo: RequestHandler;
}
