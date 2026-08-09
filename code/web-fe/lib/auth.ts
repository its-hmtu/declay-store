'use client';

import Cookies from 'js-cookie';

const TOKEN_KEY       = 'declay_token';
const REFRESH_KEY     = 'declay_refresh';
const ADMIN_TOKEN_KEY   = 'declay_admin_token';
const ADMIN_REFRESH_KEY = 'declay_admin_refresh';

const COOKIE_OPTS: Cookies.CookieAttributes = {
  expires: 7,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const auth = {
  getToken:        () => Cookies.get(TOKEN_KEY),
  getRefreshToken: () => Cookies.get(REFRESH_KEY),
  setTokens:       (access: string, refresh: string) => {
    Cookies.set(TOKEN_KEY,   access,  { ...COOKIE_OPTS, expires: 1 / 24 }); // 1 hour
    Cookies.set(REFRESH_KEY, refresh, COOKIE_OPTS);
  },
  clearTokens: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_KEY);
  },
  isLoggedIn: () => !!Cookies.get(TOKEN_KEY),
};

export const adminAuth = {
  getToken:        () => Cookies.get(ADMIN_TOKEN_KEY),
  getRefreshToken: () => Cookies.get(ADMIN_REFRESH_KEY),
  setToken:        (token: string) => Cookies.set(ADMIN_TOKEN_KEY, token, { ...COOKIE_OPTS, expires: 1 / 3 }), // 8h
  // M-25: lưu cả refresh token để gia hạn access khi hết hạn, thay vì đăng xuất.
  setTokens: (access: string, refresh: string) => {
    Cookies.set(ADMIN_TOKEN_KEY, access, { ...COOKIE_OPTS, expires: 1 / 3 });   // 8h
    Cookies.set(ADMIN_REFRESH_KEY, refresh, { ...COOKIE_OPTS, expires: 30 });   // 30 ngày
  },
  clearToken: () => {
    Cookies.remove(ADMIN_TOKEN_KEY);
    Cookies.remove(ADMIN_REFRESH_KEY);
  },
  isLoggedIn: () => !!Cookies.get(ADMIN_TOKEN_KEY),
  /**
   * M-42: the signed-in admin's id, read from the token's `sub`.
   * Display-only — used to grey out the reply box on a colleague's conversation.
   * The server enforces ownership for real; never trust this for access control.
   */
  getAdminId: (): number | undefined => {
    const token = Cookies.get(ADMIN_TOKEN_KEY);
    if (!token) return undefined;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = Number(payload.sub);
      return Number.isInteger(id) && id > 0 ? id : undefined;
    } catch {
      return undefined;
    }
  },
};
