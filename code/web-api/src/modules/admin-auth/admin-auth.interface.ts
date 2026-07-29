import type { RequestHandler } from 'express';
import type { AdminRole } from './admin-auth.entity';

export interface IAdminLoginData {
  email: string;
  password: string;
}

export interface IAdminAuthService {
  login(data: IAdminLoginData): Promise<{ access_token: string; refresh_token: string; admin: object }>;
  refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }>;
  getAdminInfo(adminId: number): Promise<object>;
}

export interface IAdminAuthController {
  login: RequestHandler;
  refresh: RequestHandler;
  getAdminInfo: RequestHandler;
}
