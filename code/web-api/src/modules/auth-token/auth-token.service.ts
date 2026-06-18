import crypto from 'crypto';
import { Op } from 'sequelize';
import { EmailVerificationToken, PasswordResetToken } from './auth-token.entity';
import { httpError } from '@/utils/http-error';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000;              // 1 hour

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createEmailVerificationToken(userId: number): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await EmailVerificationToken.destroy({
    where: { userId, usedAt: null },
  });

  const token = generateToken();
  await EmailVerificationToken.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });

  return token;
}

export async function consumeEmailVerificationToken(token: string): Promise<number> {
  const record = await EmailVerificationToken.findOne({
    where: {
      token,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
  });

  if (!record) {
    throw httpError(400, 'Verification link is invalid or has expired');
  }

  await record.update({ usedAt: new Date() });
  return record.userId;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await PasswordResetToken.destroy({
    where: { userId, usedAt: null },
  });

  const token = generateToken();
  await PasswordResetToken.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  return token;
}

export async function consumePasswordResetToken(token: string): Promise<number> {
  const record = await PasswordResetToken.findOne({
    where: {
      token,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
  });

  if (!record) {
    throw httpError(400, 'Password reset link is invalid or has expired');
  }

  await record.update({ usedAt: new Date() });
  return record.userId;
}
