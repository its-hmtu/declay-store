import { describe, it, expect, beforeAll } from 'vitest';

// Đặt secret TRƯỚC khi import module jwt (nó đọc env lúc gọi, nhưng an toàn hơn).
beforeAll(() => {
  process.env.JWT_ADMIN_SECRET = 'test-admin-access-secret';
  process.env.JWT_ADMIN_REFRESH_SECRET = 'test-admin-refresh-secret';
});

describe('Admin refresh token (M-25)', () => {
  it('sign/verify refresh khứ hồi giữ đúng adminId + role', async () => {
    const { signAdminRefreshToken, verifyAdminRefreshToken } = await import('@/utils/jwt');
    const token = signAdminRefreshToken({ adminId: 7, email: 'a@x.com', role: 'super_admin' });
    const decoded = verifyAdminRefreshToken(token);
    expect(decoded.adminId).toBe(7);
    expect(decoded.role).toBe('super_admin');
  });

  it('access token KHÔNG dùng được làm refresh (khác secret + tokenType)', async () => {
    const { signAdminAccessToken, verifyAdminRefreshToken } = await import('@/utils/jwt');
    const access = signAdminAccessToken({ adminId: 7, email: 'a@x.com', role: 'admin' });
    expect(() => verifyAdminRefreshToken(access)).toThrow();
  });

  it('refresh token KHÔNG dùng được làm access', async () => {
    const { signAdminRefreshToken, verifyAdminAccessToken } = await import('@/utils/jwt');
    const refresh = signAdminRefreshToken({ adminId: 7, email: 'a@x.com', role: 'admin' });
    expect(() => verifyAdminAccessToken(refresh)).toThrow();
  });

  it('token rác bị từ chối', async () => {
    const { verifyAdminRefreshToken } = await import('@/utils/jwt');
    expect(() => verifyAdminRefreshToken('khong-phai-jwt')).toThrow();
  });
});
