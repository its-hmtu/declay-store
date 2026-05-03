import User from "@/user/user.entity";
import { IUserData, IAuthService } from "./auth.interface";
import { httpError } from "@/utils/http-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/utils/jwt";

export default class AuthService implements IAuthService {
  async register(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }> {
    // Implementation for user registration
    const { email, password, username, phoneNumber, fullName } = userData;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw httpError(400, 'Email is already registered');
    }

    const newUser = await User.create({ email, password, username, phoneNumber, fullName });
    const accessToken = await this.generateAccessToken(newUser);
    const refreshToken = await this.generateRefreshToken(newUser);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: newUser.toSafeJSON(),
    }
  }

  async login(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }> {
    // Implementation for user login
    const { email, password } = userData;

    // Use unscoped() to include password field (excluded by defaultScope)
    const user = await User.unscoped().findOne({ where: { email } });
    if (!user || !user.verifyPassword(password)) {
      throw httpError(401, 'Invalid email or password');
    }

    // Generate token using jsonwebtoken
    const access_token = await this.generateAccessToken(user);
    const refresh_token = await this.generateRefreshToken(user);

    return {
      access_token,
      refresh_token,
      user: user.toSafeJSON(),
    }
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; user: any }> {
    // verify refresh token and generate new access token
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw httpError(401, 'User not found or token is invalid');
    }

    const access_token = await this.generateAccessToken(user);

    return {
      access_token,
      user: user.toSafeJSON(),
    };
  }

  async generateAccessToken(user: User): Promise<string> {
    return signAccessToken({ userId: user.id, email: user.email });
  }

  async generateRefreshToken(user: User): Promise<string> {
    return signRefreshToken({ userId: user.id, email: user.email });
  }

  async userInfo(userId: number | undefined): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }

    return user;
  }
}