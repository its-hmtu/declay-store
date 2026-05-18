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

export interface Product {
  id: number;
  categoryId?: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  category?: Category;
  variants?: ProductVariant[];
}

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
export interface Address {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
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
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

/* ── Checkout ──────────────────────────────────────────── */
export interface CheckoutResult {
  orderId: number;
  clientSecret: string;
}
