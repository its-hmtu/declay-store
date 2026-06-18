import dotenv from 'dotenv';

dotenv.config();

const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },
  adminJwt: {
    secret: process.env.JWT_ADMIN_SECRET,
    expiredIn: process.env.JWT_ADMIN_EXPIRED_IN || '8h',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  server: {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Declay Store <noreply@declay.store>',
  },
}

export default config;
