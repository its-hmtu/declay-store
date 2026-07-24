import type { ApiResponse, ApiError } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type RequestOptions = {
  token?: string;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  _retry?: boolean;
};

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
}

function writeCookie(name: string, value: string, maxAge: number): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { token, body, method = 'GET', cache, next } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  const json = await res.json();

  if (!res.ok) {
    if (res.status === 401 && !options._retry) {
      if (path.startsWith('/admin')) {
        // Admin token rejected — clear it so the admin layout redirects to login.
        // Never touch the customer session here.
        deleteCookie('declay_admin_token');
      } else {
        const refreshToken = readCookie('declay_refresh');
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshJson = await refreshRes.json();
              const newToken = (refreshJson as ApiResponse<{ accessToken: string }>).data.accessToken;
              writeCookie('declay_token', newToken, 3600);
              return request(path, { ...options, token: newToken, _retry: true });
            }
          } catch {}
          deleteCookie('declay_token');
          deleteCookie('declay_refresh');
        }
      }
    }
    const err = json as ApiError;
    throw new ApiRequestError(err.message, res.status, err.errorCode, err.errors);
  }

  return json as ApiResponse<T>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
    public readonly errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/* ── Convenience wrappers ──────────────────────────────── */
export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  put: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

/* ── Domain helpers (server-side, pass token from cookies) ─ */
export const productsApi = {
  list: (params?: { page?: number; limit?: number; categoryId?: number; collectionId?: number; search?: string; sort?: string; minPrice?: number; maxPrice?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)       qs.set('page',       String(params.page));
    if (params?.limit)      qs.set('limit',      String(params.limit));
    if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
    if (params?.collectionId) qs.set('collectionId', String(params.collectionId));
    if (params?.minPrice != null) qs.set('minPrice', String(params.minPrice));
    if (params?.maxPrice != null) qs.set('maxPrice', String(params.maxPrice));
    if (params?.search)     qs.set('search',     params.search);
    if (params?.sort)       qs.set('sort',       params.sort);
    return api.get<import('./types').Product[]>(`/products?${qs}`, { next: { revalidate: 60 } });
  },
  detail: (slug: string) =>
    api.get<import('./types').Product>(`/products/slug/${slug}`, { next: { revalidate: 60 } }),
};

export const categoriesApi = {
  list: () => api.get<import('./types').Category[]>('/categories', { next: { revalidate: 300 } }),
  detail: (id: number) => api.get<import('./types').Category>(`/categories/${id}`),
};

export const articlesApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return api.get<import('./types').Article[]>(`/articles?${qs}`, { next: { revalidate: 120 } });
  },
  detail: (slug: string) =>
    api.get<import('./types').Article>(`/articles/${slug}`, { next: { revalidate: 120 } }),
};

export const jobsApi = {
  list: () => api.get<import('./types').Job[]>('/jobs', { next: { revalidate: 300 } }),
  detail: (id: number) => api.get<import('./types').Job>(`/jobs/${id}`),
};

export const cartApi = {
  get:    (token: string) => api.get<import('./types').Cart>('/cart', { token }),
  add:    (token: string, variantId: number, quantity: number) =>
    api.post<import('./types').Cart>('/cart/items', { variantId, quantity }, { token }),
  update: (token: string, itemId: number, quantity: number) =>
    api.put<import('./types').Cart>(`/cart/items/${itemId}`, { quantity }, { token }),
  remove: (token: string, itemId: number) =>
    api.delete<import('./types').Cart>(`/cart/items/${itemId}`, { token }),
  clear:  (token: string) => api.delete<void>('/cart', { token }),
};

export const ordersApi = {
  list:     (token: string) => api.get<import('./types').Order[]>('/orders', { token }),
  detail:   (token: string, id: number) => api.get<import('./types').Order>(`/orders/${id}`, { token }),
  checkout: (token: string, shippingAddressId: number, discountCode?: string, shippingMethodId?: number) =>
    api.post<import('./types').CheckoutResult>(
      '/orders/checkout',
      { shippingAddressId, ...(discountCode ? { discountCode } : {}), ...(shippingMethodId ? { shippingMethodId } : {}) },
      { token },
    ),
};

/* ── Wishlist (customer) ───────────────────────────────── */
export const shippingMethodsApi = {
  list: () => api.get<import('./types').ShippingMethod[]>('/shipping-methods', { next: { revalidate: 300 } }),
};

export const notificationsApi = {
  list:        (token: string) => api.get<import('./types').NotificationList>('/notifications', { token }),
  markRead:    (token: string, id: number) => api.patch<void>(`/notifications/${id}/read`, {}, { token }),
  markAllRead: (token: string) => api.post<void>('/notifications/read-all', {}, { token }),
};

export const tagsApi = {
  list: () => api.get<import('./types').Tag[]>('/tags', { next: { revalidate: 300 } }),
};

export const wishlistApi = {
  get:    (token: string) => api.get<import('./types').Wishlist>('/wishlist', { token }),
  add:    (token: string, variantId: number) =>
    api.post<import('./types').Wishlist>('/wishlist/items', { variantId }, { token }),
  remove: (token: string, itemId: number) =>
    api.delete<import('./types').Wishlist>(`/wishlist/items/${itemId}`, { token }),
  clear:  (token: string) => api.delete<import('./types').Wishlist>('/wishlist', { token }),
};

/* ── Product reviews (public read, customer write) ─────── */
export const reviewsApi = {
  list:   (productId: number) =>
    api.get<import('./types').ProductReview[]>(`/products/${productId}/reviews`),
  create: (token: string, productId: number, data: { rating: number; title?: string; body?: string }) =>
    api.post<import('./types').ProductReview>(`/products/${productId}/reviews`, data, { token }),
  remove: (token: string, productId: number, reviewId: number) =>
    api.delete<void>(`/products/${productId}/reviews/${reviewId}`, { token }),
};

/* ── Discount (customer preview against cart) ──────────── */
export const discountsApi = {
  validate: (token: string, code: string) =>
    api.post<import('./types').DiscountPreview>('/discounts/validate', { code }, { token }),
};

/* ── Banners / Settings (public) ───────────────────────── */
export const bannersApi = {
  list: () => api.get<import('./types').Banner[]>('/banners', { next: { revalidate: 120 } }),
};

export const pagesApi = {
  getBySlug: (slug: string) =>
    api.get<import('./types').Page>(`/pages/${slug}`, { next: { revalidate: 300 } }),
};

export const settingsApi = {
  getPublic: () => api.get<Record<string, string>>('/settings', { next: { revalidate: 300 } }),
};

/* ── Admin: discounts / banners / settings / users / reviews / shipment ── */
export const adminDiscountsApi = {
  list:   (token: string) => api.get<import('./types').DiscountCode[]>('/admin/discounts?limit=100', { token }),
  detail: (token: string, id: number) => api.get<import('./types').DiscountCode>(`/admin/discounts/${id}`, { token }),
  create: (token: string, data: unknown) => api.post<import('./types').DiscountCode>('/admin/discounts', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').DiscountCode>(`/admin/discounts/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/discounts/${id}`, { token }),
};

export const adminPagesApi = {
  list:     (token: string) => api.get<import('./types').Page[]>('/admin/pages', { token }),
  detail:   (token: string, id: number) => api.get<import('./types').Page>(`/admin/pages/${id}`, { token }),
  versions: (token: string, id: number) => api.get<import('./types').PageVersion[]>(`/admin/pages/${id}/versions`, { token }),
  create:   (token: string, data: unknown) => api.post<import('./types').Page>('/admin/pages', data, { token }),
  update:   (token: string, id: number, data: unknown) => api.put<import('./types').Page>(`/admin/pages/${id}`, data, { token }),
  remove:   (token: string, id: number) => api.delete<void>(`/admin/pages/${id}`, { token }),
};

export const adminBannersApi = {
  list:   (token: string) => api.get<import('./types').Banner[]>('/admin/banners?limit=100', { token }),
  detail: (token: string, id: number) => api.get<import('./types').Banner>(`/admin/banners/${id}`, { token }),
  create: (token: string, data: unknown) => api.post<import('./types').Banner>('/admin/banners', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').Banner>(`/admin/banners/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/banners/${id}`, { token }),
};

export const adminSettingsApi = {
  list: (token: string) => api.get<import('./types').SiteSetting[]>('/admin/settings', { token }),
  save: (token: string, settings: Record<string, string | null>) =>
    api.put<import('./types').SiteSetting[]>('/admin/settings', { settings }, { token }),
};

export const adminShippingMethodsApi = {
  list:   (token: string) => api.get<import('./types').ShippingMethod[]>('/admin/shipping-methods', { token }),
  create: (token: string, data: unknown) => api.post<import('./types').ShippingMethod>('/admin/shipping-methods', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').ShippingMethod>(`/admin/shipping-methods/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/shipping-methods/${id}`, { token }),
};

export const adminNotificationsApi = {
  list:        (token: string) => api.get<import('./types').NotificationList>('/admin/notifications', { token }),
  markRead:    (token: string, id: number) => api.patch<void>(`/admin/notifications/${id}/read`, {}, { token }),
  markAllRead: (token: string) => api.post<void>('/admin/notifications/read-all', {}, { token }),
};

export const adminTagsApi = {
  list:   (token: string) => api.get<import('./types').Tag[]>('/admin/tags', { token }),
  create: (token: string, data: unknown) => api.post<import('./types').Tag>('/admin/tags', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').Tag>(`/admin/tags/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/tags/${id}`, { token }),
};

export const collectionsApi = {
  list:   () => api.get<import('./types').Collection[]>('/collections', { next: { revalidate: 0 } }),
  detail: (slug: string) => api.get<import('./types').Collection>(`/collections/${slug}`, { next: { revalidate: 120 } }),
};

export const adminCollectionsApi = {
  list:   (token: string) => api.get<import('./types').Collection[]>('/admin/collections', { token }),
  detail: (token: string, id: number) => api.get<import('./types').Collection>(`/admin/collections/${id}`, { token }),
  create: (token: string, data: unknown) => api.post<import('./types').Collection>('/admin/collections', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').Collection>(`/admin/collections/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/collections/${id}`, { token }),
};

export const adminCampaignsApi = {
  list:   (token: string) => api.get<import('./types').Campaign[]>('/admin/campaigns', { token }),
  detail: (token: string, id: number) => api.get<import('./types').Campaign>(`/admin/campaigns/${id}`, { token }),
  create: (token: string, data: unknown) => api.post<import('./types').Campaign>('/admin/campaigns', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').Campaign>(`/admin/campaigns/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/campaigns/${id}`, { token }),
};

export const adminUsersApi = {
  list:   (token: string) => api.get<import('./types').AdminUser[]>('/admin/users?limit=100', { token }),
  create: (token: string, data: unknown) => api.post<import('./types').AdminUser>('/admin/users', data, { token }),
  update: (token: string, id: number, data: unknown) => api.put<import('./types').AdminUser>(`/admin/users/${id}`, data, { token }),
  remove: (token: string, id: number) => api.delete<void>(`/admin/users/${id}`, { token }),
};

export const adminReviewsApi = {
  list:   (token: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return api.get<import('./types').ProductReview[]>(`/admin/reviews?${qs}`, { token });
  },
  remove: (token: string, reviewId: number) => api.delete<void>(`/admin/reviews/${reviewId}`, { token }),
};

/* ── Shipment (customer read) ──────────────────────────── */
export const shipmentApi = {
  getMine: (token: string, orderId: number) =>
    api.get<import('./types').Shipment>(`/orders/${orderId}/shipment`, { token }),
};

export const adminShipmentApi = {
  get:    (token: string, orderId: number) => api.get<import('./types').Shipment>(`/admin/orders/${orderId}/shipment`, { token }),
  create: (token: string, orderId: number, data: unknown) => api.post<import('./types').Shipment>(`/admin/orders/${orderId}/shipment`, data, { token }),
  update: (token: string, orderId: number, data: unknown) => api.put<import('./types').Shipment>(`/admin/orders/${orderId}/shipment`, data, { token }),
  createViaProvider: (token: string, orderId: number) => api.post<import('./types').Shipment>(`/admin/orders/${orderId}/shipment/provider`, {}, { token }),
  simulate: (token: string, orderId: number, status: string) => api.post<import('./types').Shipment>(`/admin/orders/${orderId}/shipment/simulate`, { status }, { token }),
  remove: (token: string, orderId: number) => api.delete<void>(`/admin/orders/${orderId}/shipment`, { token }),
};

export const authApi = {
  login:    (email: string, password: string) =>
    api.post<import('./types').AuthTokens>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string; phoneNumber?: string; dateOfBirth?: string }) =>
    api.post<import('./types').AuthTokens>('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
  logout: (token: string) => api.post<void>('/auth/logout', {}, { token }),
  me:     (token: string) => api.get<import('./types').User>('/auth/me', { token }),
  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
  resetPassword:  (token: string, newPassword: string) => api.post<void>('/auth/reset-password', { token, newPassword }),
  verifyEmail:    (token: string) => api.post<void>('/auth/verify-email', { token }),
};

export const adminAuthApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string }>('/admin/auth/login', { email, password }),
};

/* Multipart image upload — bypasses the JSON `request()` helper. Returns the URL. */
export async function uploadImage(file: File, token: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE_URL}/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets the boundary
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json as ApiError;
    throw new ApiRequestError(err.message || 'Upload failed', res.status, err.errorCode);
  }
  return (json as ApiResponse<{ url: string }>).data.url;
}

/* Public multipart CV upload for job applicants. Returns the URL. */
export async function uploadCv(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE_URL}/careers/cv`, { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok) {
    const err = json as ApiError;
    throw new ApiRequestError(err.message || 'Upload failed', res.status, err.errorCode);
  }
  return (json as ApiResponse<{ url: string }>).data.url;
}

export const addressApi = {
  list:   (token: string) => api.get<import('./types').Address[]>('/addresses', { token }),
  create: (token: string, data: Partial<import('./types').Address>) =>
    api.post<import('./types').Address>('/addresses', data, { token }),
  update: (token: string, id: number, data: Partial<import('./types').Address>) =>
    api.put<import('./types').Address>(`/addresses/${id}`, data, { token }),
  remove: (token: string, id: number) =>
    api.delete<void>(`/addresses/${id}`, { token }),
};

/* ── User profile (customer) ───────────────────────────── */
export const userApi = {
  getInfo:    (token: string) => api.get<import('./types').User>('/users/info', { token }),
  updateInfo: (token: string, data: Partial<import('./types').User>) =>
    api.put<import('./types').User>('/users/info', data, { token }),
  changePassword: (token: string, data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.post<void>('/users/change-password', data, { token }),
};
