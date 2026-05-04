import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendSuccess } from "@/utils/response";
import { IUserService, IUserController } from "./user.interface";
import { httpError } from "@/utils/http-error";

export default class UserController implements IUserController {
  constructor(
    private userService: IUserService
  ) {}

  getUserInfo = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;

    if (!userId) {
      throw httpError(401, 'User ID not found in request');
    }

    const userInfo = await this.userService.getUserInfo(userId);
    sendSuccess(res, userInfo.toSafeJSON(), 'User info retrieved successfully');
  });

  updateUserInfo = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;

    if (!userId) {
      throw httpError(401, 'User ID not found in request');
    }

    const { username, fullName, phoneNumber } = req.body;
    const updatedUser = await this.userService.updateUserInfo(userId, {
      username,
      fullName,
      phoneNumber,
    });

    sendSuccess(res, updatedUser.toSafeJSON(), 'User info updated successfully');
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;

    if (!userId) {
      throw httpError(401, 'User ID not found in request');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw httpError(400, 'Current password and new password are required');
    }

    await this.userService.changePassword(userId, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  });
}
