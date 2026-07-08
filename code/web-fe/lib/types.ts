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
  parent?: Category;
  children?: Category[];
}

/* ── Product & Variant ─────────────────────────────────── */
export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price: string;
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
  | 'cancelled';

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  quantity: number;
  priceAtPurchase: string;
  variantNameAtPurchase: string;
  productNameAtPurchase: string;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmount: string;
  stripePaymentIntentId?: string;
  shippingAddressId?: number;
  notes?: string;
  items?: OrderItem[];
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
  clientSecret: string;
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
  carrier: string;
  trackingNumber: string;
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
