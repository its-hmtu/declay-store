export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errorCode?: string;
  errors?: { field: string; message: string }[];
}

/* ── Auth ──────────────────────────────────────────────── */
export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface AuthAdmin {
  adminId: number;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
}

/* ── Category ──────────────────────────────────────────── */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  isActive: boolean;
  /** M-47: admin flagged this category for a product row on the home page. */
  showOnHome?: boolean;
  parent?: Category;
  children?: Category[];
}

/* ── Product & Variant ─────────────────────────────────── */
export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price: string;
  specialPrice: string | null;
  /** M-03: admin-only fields — absent in storefront responses. */
  costPrice?: string | number | null;
  weightGram?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  /** M-04: present only for admin/super_admin. */
  margin?: number | null;
  marginPercent?: number | null;
  /**
   * M-40: pricing computed by the server (`lib/pricing.ts`). The storefront must
   * DISPLAY these and never re-derive them — that duplication is what let the
   * cart and checkout drift apart before.
   */
  basePrice?: number;
  effectivePrice?: number;
  discountPercent?: number;
  onSale?: boolean;
  source?: 'base' | 'special' | 'campaign';
  stock: number;
  images: string[];
  isActive: boolean;
}

export interface ProductRating {
  average: number;
  count: number;
}

export interface Product {
  id: number;
  categoryId?: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  views?: number;
  category?: Category;
  variants?: ProductVariant[];
  rating?: ProductRating;
  salesCount?: number;
  campaignDiscountPercent?: number | null;
  /** M-44: campaign identity, for named badges and the product-page countdown. */
  campaignId?: number | null;
  campaignName?: string | null;
  campaignEndsAt?: string | null;
  /** M-48: every admin list shows created/updated; the API has always sent these. */
  createdAt?: string;
  updatedAt?: string;
}

// M-07: COD cash awaiting reconciliation.
export interface CodPendingRow {
  paymentId: number;
  orderId: number;
  amount: number;
  status: string;
  deliveredAt: string | null;
  customer: string;
}

// M-05: per-SKU sales report (validation instrument).
export interface RankedSku {
  rank: number;
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  unitShare: number;
}

export interface TopSkuReport {
  period: string;
  from: string | null;
  rows: RankedSku[];
  totals: { totalUnits: number; totalRevenue: number; skuCount: number };
}

export interface ProductViewRow { id: number; name: string; slug: string; views: number }

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** M-46: cover image — carousel, page header and OG share card. */
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  productIds?: number[];
  /** Present when the list was requested with `withProducts`. */
  products?: Product[];
  productCount?: number;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  discountPercent: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  productIds?: number[];
}

/** M-41: dry-run result — what a campaign would cost in margin, and what it collides with. */
export interface MarginWarning {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  effectivePrice: number;
  costPrice: number;
  margin: number;
  marginPercent: number;
  severity: 'below-cost' | 'thin-margin';
}

export interface CampaignImpact {
  warnings: MarginWarning[];
  summary: { belowCost: number; thinMargin: number; worstMarginPercent: number | null };
  overlaps: Array<{ productId: number; campaignId: number; name: string; discountPercent: number }>;
  variantsWithoutCost: number;
}

// ── M-42: live chat ──────────────────────────────────────────

export type ChatMode = 'bot' | 'waiting' | 'live' | 'closed';

export interface LiveChatMessage {
  id: number;
  /** 'system' rows are transcript markers, rendered as a centred note, not a bubble. */
  role: 'user' | 'assistant' | 'staff' | 'system';
  content: string;
  authorName: string | null;
  createdAt: string;
}

export interface LiveChatTranscript {
  session: { id: number; mode: ChatMode; staffName: string | null };
  messages: LiveChatMessage[];
}

export interface InboxItem {
  id: number;
  mode: ChatMode;
  reason: string | null;
  customerName: string | null;
  customerEmail: string | null;
  userId: number | null;
  isGuest: boolean;
  assignedAdminId: number | null;
  assignedAdminName: string | null;
  handoffRequestedAt: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
  waitingSeconds: number | null;
}

export interface StaffTranscript {
  session: {
    id: number;
    mode: ChatMode;
    reason: string | null;
    customerName: string | null;
    customerEmail: string | null;
    userId: number | null;
    assignedAdminId: number | null;
    assignedAdminName: string | null;
    handoffRequestedAt: string | null;
  };
  messages: LiveChatMessage[];
}

export const PRODUCT_SORTS = [
  { value: 'newest',       label: 'Newest' },
  { value: 'best-sellers', label: 'Best Sellers' },
  { value: 'top-rated',    label: 'Top Rated' },
  { value: 'trending',     label: 'Trending' },
  { value: 'price-asc',    label: 'Price: Low to High' },
  { value: 'price-desc',   label: 'Price: High to Low' },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]['value'];

/* ── Cart ──────────────────────────────────────────────── */
export interface CartItem {
  id: number;
  cartId: number;
  variantId: number;
  quantity: number;
  variant?: ProductVariant & { product?: Product };
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
}

/* ── Order ─────────────────────────────────────────────── */
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  quantity: number;
  priceAtPurchase: string;
  variantNameAtPurchase: string;
  productNameAtPurchase: string;
  /** M-30: ảnh sản phẩm cho trang chi tiết đơn. */
  variant?: { id: number; name: string; images: string[] } | null;
}

export interface Order {
  id: number;
  /** M-16: mã hiển thị cho khách (DC-YYMMDD-XXXX). Dùng cái này, không dùng id. */
  orderCode: string;
  userId: number;
  status: OrderStatus;
  totalAmount: string;
  // M-30: tách tiền để hiển thị bảng thanh toán.
  subtotal?: string;
  shippingFee?: string;
  discountAmount?: string;
  discountCode?: { id: number; code: string } | null;
  shippingAddress?: Address | null;
  stripePaymentIntentId?: string;
  shippingAddressId?: number;
  notes?: string;
  // M-30: mốc thời gian trạng thái cho dòng thời gian.
  paidAt?: string | null;
  processingAt?: string | null;
  // M-06: return window (7 days after delivery).
  deliveredAt?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  items?: OrderItem[];
  /** M-13d: vận đơn GHN, có sau khi admin xác nhận đơn. */
  shipment?: Shipment | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Article ───────────────────────────────────────────── */
export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  authorId?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Address ───────────────────────────────────────────── */
export type AddressType = 'home' | 'work' | 'other';

export interface Address {
  id: number;
  userId: number;
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  addressLine2?: string | null;
  ward: string;
  district: string;
  city: string;
  country: string;
  postalCode?: string | null;
  isDefault: boolean;
  addressType: AddressType;
  // M-13: mã địa giới GHN. Địa chỉ tạo trước tích hợp GHN sẽ null → cần cập nhật.
  ghnProvinceId?: number | null;
  ghnDistrictId?: number | null;
  ghnWardCode?: string | null;
}

/* ── Job & Application ─────────────────────────────────── */
export interface Job {
  id: number;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  isOpen: boolean;
  createdAt: string;
}

export type ApplicationStatus =
  | 'received'
  | 'reviewing'
  | 'interview'
  | 'hired'
  | 'rejected';

export interface JobApplication {
  id: number;
  jobId: number;
  applicantName: string;
  email: string;
  cvUrl?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  createdAt: string;
}

/* ── User ──────────────────────────────────────────────── */
export interface User {
  id: number;
  email: string;
  username: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  authProvider: 'local' | 'google' | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Checkout ──────────────────────────────────────────── */
export interface CheckoutResult {
  order: Order;
  clientSecret: string | null;
  /** M-12: present only for VNPay — redirect the buyer here. */
  paymentUrl?: string | null;
}

/* ── Wishlist ──────────────────────────────────────────── */
export interface WishlistItem {
  id: number;
  wishlistId: number;
  variantId: number;
  addedAt: string;
  variant?: {
    id: number;
    name: string;
    price: number | string;
    stock: number;
    images: string[];
    product?: { id: number; name: string; slug: string };
  };
}

export interface Wishlist {
  id: number;
  userId: number;
  items: WishlistItem[];
}

/* ── Product Reviews ───────────────────────────────────── */
export interface ReviewAuthor {
  id: number;
  fullName: string | null;
  username: string | null;
}

export interface ProductReview {
  id: number;
  userId: number;
  productId: number;
  variantId?: number | null;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user?: ReviewAuthor;
  product?: { id: number; name: string; slug: string };
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/* ── Discounts ─────────────────────────────────────────── */
export type DiscountType = 'percent' | 'fixed';

export interface DiscountCode {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DiscountPreview {
  discountCodeId: number;
  code: string;
  type: DiscountType;
  value: number;
  discountAmount: number;
  orderAmount: number;
}

/* ── Banners ───────────────────────────────────────────── */
export interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

/* ── Site Settings ─────────────────────────────────────── */
export interface SiteSetting {
  key: string;
  value: string | null;
  updatedAt: string;
}

/* ── Admin Users ───────────────────────────────────────── */
export type AdminRole = 'super_admin' | 'admin' | 'editor';

export interface AdminUser {
  id: number;
  email: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

/* ── Order Shipment ────────────────────────────────────── */
export interface Shipment {
  id: number;
  orderId: number;
  provider: string;
  providerShipmentId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  incoterm: string | null;
  labelUrl: string | null;
  cost: number | null;
  currency: string | null;
  lastEvent: string | null;
  lastEventAt: string | null;
  podUrl: string | null;
  shippedAt: string;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
  effectiveDate: string | null;
  version: number;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageVersion {
  id: number;
  pageId: number;
  version: number;
  title: string;
  body: string;
  effectiveDate: string | null;
  isPublished: boolean;
  editedBy: number | null;
  createdAt: string;
}

export interface ShippingMethod {
  id: number;
  name: string;
  description: string | null;
  zone: 'all' | 'domestic' | 'international';
  fee: number;
  freeOver: number | null;
  estimatedDays: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Notification {
  id: number;
  recipientType: 'admin' | 'user';
  recipientId: number | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  rows: Notification[];
  count: number;
  unread: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}
