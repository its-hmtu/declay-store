import dotenv from 'dotenv';

dotenv.config();

const cloudinaryUrl = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL || '');

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
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    payUrl: process.env.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || '',   // trang FE hiển thị kết quả
    // VNPay chỉ nhận VND, cửa hàng niêm yết USD -> BẮT BUỘC có tỉ giá.
    // Không đặt mặc định: tỉ giá sai/thiếu phải làm đơn hàng thất bại ngay,
    // thay vì âm thầm gửi $350 sang cổng thành 350đ.
    usdToVnd: Number(process.env.VNPAY_USD_TO_VND ?? process.env.VNPAY_CURRENCY_RATE ?? 0),
    expireMinutes: Number(process.env.VNPAY_EXPIRE_MINUTES) || 15,
  },
  easyship: {
    apiKey: process.env.EASYSHIP_API_KEY || '',
    webhookSecret: process.env.EASYSHIP_WEBHOOK_SECRET || '',
    baseUrl: process.env.EASYSHIP_BASE_URL || 'https://public-api.easyship.com',
    sandbox: (process.env.EASYSHIP_SANDBOX ?? 'true') !== 'false',
    incotermDefault: (process.env.EASYSHIP_INCOTERM || 'DDP') as 'DDP' | 'DDU',
  },
  shipping: {
    // Simulated durations so the order lifecycle is observable in development.
    // In production set dayMs to 86400000 (a real day) and raise the delays.
    processingDelayMs: Number(process.env.SHIPPING_PROCESSING_DELAY_MS) || 15000, // paid -> processing
    dispatchDelayMs: Number(process.env.SHIPPING_DISPATCH_DELAY_MS) || 15000,     // processing -> shipped
    dayMs: Number(process.env.SHIPPING_DAY_MS) || 15000,                          // simulated length of one shipping day
  },
  bankTransfer: {
    bankId: process.env.BANK_ID || '',            // VietQR bank code/BIN, e.g. 'vietcombank'
    accountNo: process.env.BANK_ACCOUNT_NO || '',
    accountName: process.env.BANK_ACCOUNT_NAME || '',
  },
  payments: {
    enabledDomestic: (process.env.PAYMENTS_DOMESTIC || 'bank_transfer,cod').split(',').map((x) => x.trim()).filter(Boolean),
    enabledInternational: (process.env.PAYMENTS_INTERNATIONAL || 'stripe').split(',').map((x) => x.trim()).filter(Boolean),
  },
  reservation: {
    // Auto-expire unpaid orders and release their reserved stock after this window (W-03).
    ttlMs: Number(process.env.RESERVATION_TTL_MS) || 30 * 60 * 1000, // 30 minutes
  },
  notifications: {
    // Alert admins when a variant's stock falls to or below this level (W-17).
    lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 5,
  },
  server: {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    // Public base URL for serving uploaded files (used to build absolute image URLs)
    publicUrl: process.env.APP_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || (cloudinaryUrl ? cloudinaryUrl[3] : ''),
    apiKey: process.env.CLOUDINARY_API_KEY || (cloudinaryUrl ? cloudinaryUrl[1] : ''),
    apiSecret: process.env.CLOUDINARY_API_SECRET || (cloudinaryUrl ? cloudinaryUrl[2] : ''),
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Declay Store <noreply@declay.store>',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    // Defaults set to Haiku for cheap testing. For production, set the env vars
    // to claude-sonnet-4-6 (storefront) and claude-opus-4-8 (admin).
    storefrontModel: process.env.ANTHROPIC_STOREFRONT_MODEL || 'claude-haiku-4-5',
    adminModel: process.env.ANTHROPIC_ADMIN_MODEL || 'claude-haiku-4-5',
  },
}

export default config;
