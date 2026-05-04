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
    const { refresh_token } = req.body;
    const result = await this.authService.refreshToken(refresh_token);
    
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
      throw httpError(401, 'Google authentication failed');
    }

    const result = await this.authService.handleOAuthCallback(user);
    const { access_token, refresh_token } = result;

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

    // Redirect to frontend with success or send JSON response
    sendSuccess(res, { ...result.user }, 'Google login successful', 200);
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