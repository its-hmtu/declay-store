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
  list: (params?: { page?: number; limit?: number; categoryId?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)       qs.set('page',       String(params.page));
    if (params?.limit)      qs.set('limit',      String(params.limit));
    if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
    if (params?.search)     qs.set('search',     params.search);
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
  checkout: (token: string, addressId: number) =>
    api.post<import('./types').CheckoutResult>('/orders/checkout', { addressId }, { token }),
};

export const authApi = {
  login:    (email: string, password: string) =>
    api.post<import('./types').AuthTokens>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post<import('./types').AuthTokens>('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
  logout: (token: string) => api.post<void>('/auth/logout', {}, { token }),
  me:     (token: string) => api.get<import('./types').User>('/auth/me', { token }),
};

export const adminAuthApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string }>('/admin/auth/login', { email, password }),
};

export const addressApi = {
  list:   (token: string) => api.get<import('./types').Address[]>('/addresses', { token }),
  create: (token: string, data: Partial<import('./types').Address>) =>
    api.post<import('./types').Address>('/addresses', data, { token }),
};
