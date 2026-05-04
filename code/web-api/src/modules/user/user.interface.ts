import User from "@/modules/user/user.entity";
import type { RequestHandler } from "express";

export interface IUserService {
  getUserInfo(userId: number): Promise<User>;
  updateUserInfo(userId: number, updateData: {
    username?: string;
    fullName?: string;
    phoneNumber?: string;
  }): Promise<User>;
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
}

export interface IUserController {
  getUserInfo: RequestHandler;
  updateUserInfo: RequestHandler;
  changePassword: RequestHandler;
}
