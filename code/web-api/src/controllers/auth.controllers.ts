import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AuthenticatedUser,
} from "../utils/jwt";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/http-error";
import { sendSuccess } from "../utils/response";
import { type Request, type Response } from "express";
import User from "../models/User";

interface LoginBody {
  email?: string;
  password?: string;
}

interface RefreshBody {
  refreshToken?: string;
}

async function validateLoginCredentials(body: LoginBody): Promise<AuthenticatedUser> {
  if (!body.email || !body.password) {
    throw new AppError("Email and password are required", {
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  }

  const user = await User.unscoped().findOne({ where: { email: body.email } });
  if (!user || !user.verifyPassword(body.password)) {
    throw new AppError("Invalid email or password", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  if (!user.isActive) {
    throw new AppError("User account is inactive", {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

function createTokenResponse(user: AuthenticatedUser) {
  return {
    tokenType: "Bearer",
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    user,
  };
}

class AuthController {
  constructor() {}

  static register = asyncHandler(async (request: Request, response: Response) => {
    const { email, password, username, full_name } = request.body;
    if (!email || !password) {
      throw new AppError("Email and password are required", {
        statusCode: 400,
        code: "BAD_REQUEST",
      });
    }

    // check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError("Email already in use", {
        statusCode: 400,
        code: "BAD_REQUEST",
      });
    }

    const newUser = await User.create({
      email,
      passwordHash: password,
      username,
      fullName: full_name,
    });

    const authUser = {
      userId: newUser.id,
      email: newUser.email,
    };

    sendSuccess(response, createTokenResponse(authUser), "User registered successfully");
  });

  static login = asyncHandler(async (request: Request, response: Response) => {
    const user = await validateLoginCredentials(request.body as LoginBody);

    sendSuccess(response, createTokenResponse(user), "Login successful");
  });

  static refresh = asyncHandler(
    async (request: Request, response: Response) => {
      const body = request.body as RefreshBody;

      if (!body.refreshToken) {
        throw new AppError("refreshToken is required", {
          statusCode: 400,
          code: "BAD_REQUEST",
        });
      }

      const user = verifyRefreshToken(body.refreshToken);
      const accessToken = signAccessToken(user);

      sendSuccess(
        response,
        {
          tokenType: "Bearer",
          accessToken,
          accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
        },
        "Token refreshed",
      );
    },
  );

  static currentUser = asyncHandler(async (request: Request, response: Response) => {
    if (!request.auth) {
      throw new AppError("Unauthorized", {
        statusCode: 401,
        code: "UNAUTHORIZED",
      });
    }

    const {userId} = request.auth;
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    sendSuccess(response, user, "Authenticated user profile");
  });
}

export default AuthController;
