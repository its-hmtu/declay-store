import nodemailer from 'nodemailer';
import config from '@/config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${config.oauth.frontendUrl}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: 'Verify your Declay Store email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">Welcome to Declay Store</h2>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#7c5c3e;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px">If you didn't create an account, you can ignore this email.</p>
        <p style="color:#aaa;font-size:11px;word-break:break-all">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${config.oauth.frontendUrl}/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: 'Reset your Declay Store password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">Password Reset</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#7c5c3e;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#aaa;font-size:11px;word-break:break-all">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}
