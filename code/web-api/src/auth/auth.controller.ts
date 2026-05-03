import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendError, sendSuccess } from "@/utils/response";
import { IAuthService, IAuthController } from "./auth.interface";
import { httpError } from "@/utils/http-error";

export default class AuthController implements IAuthController {
  constructor(
    private authService: IAuthService
  ) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, username, fullName, phoneNumber } = req.body;
    const result = await this.authService.register({ email, password, username, fullName, phoneNumber });
    
    if (result) {
      const { access_token, refresh_token, user } = result;

      // set tokens in http-only cookies
      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, { ...user }, 'User registered successfully', 201);
    } 

    throw httpError(500, 'Something went wrong');
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login({ email, password });
    
    if (result) {
      const { access_token, refresh_token, user } = result;
      // set tokens in http-only cookies
      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, { ...user }, 'Login successful');
    } else {
      throw httpError(500, 'Something went wrong');
    }
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.authService.refreshToken(refreshToken);
    
    if (!result) {
      throw httpError(401, 'Invalid refresh token');
    }

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    sendSuccess(res, null, 'Token refreshed successfully');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    sendSuccess(res, null, 'Logged out successfully');
  });

  getUserInfo = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await this.authService.userInfo(userId);

    if (result) {
      sendSuccess(res, result, 'User info retrieved successfully');
    } else {
      throw httpError(404, 'User not found');
    }
  });
}