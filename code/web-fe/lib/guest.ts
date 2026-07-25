/**
 * Guest session (M-01). Lets a visitor use the cart and check out without an account.
 * The id is a random opaque string kept in a cookie and sent as `X-Guest-Session`.
 */
const COOKIE = 'declay_guest';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
}

function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'g' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const guestSession = {
  /** Current guest id without creating one (server-safe). */
  peek(): string | undefined {
    return readCookie(COOKIE);
  },
  /** Current guest id, creating and persisting one on first use. */
  get(): string {
    const existing = readCookie(COOKIE);
    if (existing) return existing;
    const id = newId();
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${id}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
    return id;
  },
  clear(): void {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
  },
};
