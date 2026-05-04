import User from "@/user/user.entity";
import type { RequestHandler } from "express";

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
  handleOAuthCallback(user: User): Promise<{ access_token: string; refresh_token: string; user: any }>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}

export interface IAuthController {
  register: RequestHandler;
  login: RequestHandler;
  refreshToken: RequestHandler;
  logout: RequestHandler;
  getUserInfo: RequestHandler;
  googleAuthCallback: RequestHandler;
  forgotPassword: RequestHandler;
  resetPassword: RequestHandler;
}
