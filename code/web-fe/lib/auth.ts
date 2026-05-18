'use client';

import Cookies from 'js-cookie';

const TOKEN_KEY       = 'declay_token';
const REFRESH_KEY     = 'declay_refresh';
const ADMIN_TOKEN_KEY = 'declay_admin_token';

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
  getToken:  () => Cookies.get(ADMIN_TOKEN_KEY),
  setToken:  (token: string) => Cookies.set(ADMIN_TOKEN_KEY, token, { ...COOKIE_OPTS, expires: 1 / 3 }), // 8h
  clearToken: () => Cookies.remove(ADMIN_TOKEN_KEY),
  isLoggedIn: () => !!Cookies.get(ADMIN_TOKEN_KEY),
};
