import User from '@/modules/user/user.entity';
import { IUserData, IAuthService } from './auth.interface';
import { httpError } from '@/utils/http-error';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { emailQueue } from '@/lib/email-queue';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from '@/modules/auth-token/auth-token.service';

export default class AuthService implements IAuthService {
  async register(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const { email, password, username, phoneNumber, fullName } = userData;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw httpError(400, 'Email is already registered');
    }

    const newUser = await User.create({ email, password, username, phoneNumber, fullName });

    const token = await createEmailVerificationToken(newUser.id);
    await emailQueue.add('verify-email', { to: email, token });

    const accessToken = await this.generateAccessToken(newUser);
    const refreshToken = await this.generateRefreshToken(newUser);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: newUser.toSafeJSON(),
    };
  }

  async login(userData: IUserData): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const { email, password } = userData;

    const user = await User.unscoped().findOne({ where: { email } });
    if (!user || !user.verifyPassword(password)) {
      throw httpError(401, 'Invalid email or password');
    }

    const access_token = await this.generateAccessToken(user);
    const refresh_token = await this.generateRefreshToken(user);

    return { access_token, refresh_token, user: user.toSafeJSON() };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; user: any }> {
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw httpError(401, 'User not found or token is invalid');
    }

    const access_token = await this.generateAccessToken(user);
    return { access_token, user: user.toSafeJSON() };
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

  async handleOAuthCallback(user: User): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const access_token = await this.generateAccessToken(user);
    const refresh_token = await this.generateRefreshToken(user);
    return { access_token, refresh_token, user: user.toSafeJSON() };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ where: { email } });
    // Return silently even if user not found — prevents email enumeration
    if (!user) return;

    const token = await createPasswordResetToken(user.id);
    await emailQueue.add('reset-password', { to: email, token });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await consumePasswordResetToken(token);

    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }

    await user.update({ password: newPassword });
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await consumeEmailVerificationToken(token);

    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError(404, 'User not found');
    }

    if (user.isEmailVerified) return;

    await user.update({ isEmailVerified: true });
  }
}
