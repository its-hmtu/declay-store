import User from "@/user/user.entity";
import type { Request, Response, RequestHandler } from "express";

export interface IUserData {
  email: string;
  password: string;
  fullName?: string;
  username?: string;
  phoneNumber?: string;
}

export interface IAuthService {
  register(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }>;
  login(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }>;
  refreshToken(refreshToken: string): Promise<{ access_token: string; user: { id: number; email: string } }>;
  generateAccessToken(user: any): Promise<string>;
  generateRefreshToken(user: any): Promise<string>;
  userInfo(userId: number | undefined): Promise<User>;
}

export interface IAuthController {
  register: RequestHandler;
  login: RequestHandler;
  refreshToken: RequestHandler;
  logout: RequestHandler;
  getUserInfo: RequestHandler;
}
