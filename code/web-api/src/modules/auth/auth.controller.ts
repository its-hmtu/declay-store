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
      sendSuccess(res, { accessToken: access_token, refreshToken: refresh_token, user }, 'User registered successfully', 201);
      return;
    }

    throw httpError(500, 'Something went wrong');
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login({ email, password });

    if (result) {
      const { access_token, refresh_token, user } = result;
      sendSuccess(res, { accessToken: access_token, refreshToken: refresh_token, user });
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

    sendSuccess(res, { accessToken: result.access_token });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    sendSuccess(res, null, 'Logged out successfully');
  });

  getUserInfo = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;
    const result = await this.authService.userInfo(userId);

    if (result) {
      sendSuccess(res, result, 'User info retrieved successfully');
    } else {
      throw httpError(404, 'User not found');
    }
  });

  googleAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const result = await this.authService.handleOAuthCallback(user);
    const { access_token, refresh_token } = result;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      accessToken:  access_token,
      refreshToken: refresh_token,
    });
    res.redirect(`${frontendUrl}/auth/callback?${params}`);
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await this.authService.forgotPassword(email);
    sendSuccess(res, null, 'Password reset instructions sent to email');
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    await this.authService.resetPassword(token, newPassword);
    sendSuccess(res, null, 'Password reset successful');
  });
}