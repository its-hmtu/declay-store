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
    expireMinutes: Number(process.env.VNPAY_EXPIRE_MINUTES) || 15,
    // M-29b: API hoàn tiền. VNPay KHOÁ refund ở sandbox — phải liên hệ VNPAY để
    // bật. Vì vậy mặc định TẮT: khi tắt, RefundService ghi nhận yêu cầu hoàn ở
    // trạng thái 'pending' để admin xử lý tay, KHÔNG gọi API thật.
    refundEnabled: process.env.VNPAY_REFUND_ENABLED === 'true',
    refundApiUrl: process.env.VNPAY_REFUND_API_URL
      || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  },
  // M-13: GHN — vận chuyển nội địa.
  ghn: {
    // .trim(): giá trị dán từ dashboard hoặc file CRLF dễ mang theo khoảng trắng,
    // mà header HTTP có ký tự lạ sẽ làm fetch ném lỗi rất khó truy.
    token: (process.env.GHN_TOKEN || '').trim(),
    shopId: (process.env.GHN_SHOP_ID || '').trim(),
    // Môi trường dev của GHN (dev-online-gateway) đã ngừng phản hồi, nên mặc
    // định là production. An toàn KHÔNG còn dựa vào URL mà dựa vào quyền thao
    // tác: xem ghn.mode.ts — tính phí là chỉ đọc, không tạo ra gì.
    // .replace(/\/+$/): bỏ dấu '/' thừa ở cuối. Nếu không, nối với '/shiip/...'
    // thành '//shiip' và gateway GHN routing coi là path khác -> 404.
    baseUrl: (process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn').trim().replace(/\/+$/, ''),
    // Chỉ bật khi thực sự muốn tạo vận đơn THẬT (phát sinh cước).
    allowWrite: process.env.GHN_ALLOW_WRITE === 'true',
    // Ghi đè chế độ cho môi trường test: mock | preview | readonly | live.
    // 'preview' gọi API preview thật của GHN — kiểm chứng đầy đủ mà không tạo đơn.
    mode: (process.env.GHN_MODE || '').trim().toLowerCase(),
    // Kho lấy hàng. Bỏ trống thì GHN dùng địa chỉ mặc định của ShopId.
    fromDistrictId: Number(process.env.GHN_FROM_DISTRICT_ID) || 0,
    fromWardCode: (process.env.GHN_FROM_WARD_CODE || '').trim(),
    // 2 = Hàng nhẹ (E-Commerce Delivery), 5 = Hàng nặng.
    serviceTypeId: Number(process.env.GHN_SERVICE_TYPE_ID) || 2,
    // Chính sách phí của cửa hàng (VND).
    freeOverVnd: Number(process.env.SHIPPING_FREE_OVER_VND) || 0,
    subsidyVnd: Number(process.env.SHIPPING_SUBSIDY_VND) || 0,
    // M-27: job tự động kéo trạng thái vận đơn từ GHN (lưới an toàn khi webhook
    // không tới — server ngủ, chưa đăng ký URL). Mặc định BẬT khi có token thật;
    // đặt GHN_SYNC_ENABLED=false để tắt hẳn. KHÔNG chạy ở chế độ mock (getOrderStatus
    // giả luôn trả 'delivered', sẽ đánh dấu nhầm mọi đơn dev).
    syncEnabled: process.env.GHN_SYNC_ENABLED
      ? process.env.GHN_SYNC_ENABLED === 'true'
      : Boolean((process.env.GHN_TOKEN || '').trim()),
    // Nhịp quét. 15 phút đủ nhanh cho khách mà không phiền API GHN.
    syncIntervalMs: Number(process.env.GHN_SYNC_INTERVAL_MS) || 15 * 60 * 1000,
    // Số vận đơn xử lý mỗi nhịp — chặn một cửa hàng bận làm nghẽn một lượt quét.
    syncBatchSize: Number(process.env.GHN_SYNC_BATCH_SIZE) || 50,
    // M-29e: địa chỉ NHẬN hàng trả (kho shop) cho vận đơn chiều về. Thiếu bất kỳ
    // trường nào -> không tự tạo vận đơn trả, admin nhập mã tay.
    shopName: (process.env.GHN_SHOP_NAME || '').trim(),
    shopPhone: (process.env.GHN_SHOP_PHONE || '').trim(),
    shopAddress: (process.env.GHN_SHOP_ADDRESS || '').trim(),
  },
  easyship: {
    apiKey: process.env.EASYSHIP_API_KEY || '',
    webhookSecret: process.env.EASYSHIP_WEBHOOK_SECRET || '',
    baseUrl: process.env.EASYSHIP_BASE_URL || 'https://public-api.easyship.com',
    sandbox: (process.env.EASYSHIP_SANDBOX ?? 'true') !== 'false',
    incotermDefault: (process.env.EASYSHIP_INCOTERM || 'DDP') as 'DDP' | 'DDU',
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
