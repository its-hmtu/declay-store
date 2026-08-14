import { describe, it, expect, vi } from 'vitest';

// Isolate requireRole from its module's side-effect imports (redis, jwt).
vi.mock('@/lib/redis', () => ({ redisOperations: { set: vi.fn(), exists: vi.fn(), get: vi.fn() } }));
vi.mock('@/utils/jwt', () => ({ verifyAdminAccessToken: vi.fn() }));

import { requireRole } from '@/middlewares/admin.middleware';

const res = {} as any;

describe('requireRole (W-05/W-06)', () => {
  it('401 when no admin on request', () => {
    const next = vi.fn();
    requireRole('admin')({} as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  it('403 when role is not allowed (editor hitting admin-only)', () => {
    const next = vi.fn();
    requireRole('admin', 'super_admin')({ admin: { role: 'editor' } } as any, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  it('passes through when role is allowed', () => {
    const next = vi.fn();
    requireRole('admin', 'super_admin')({ admin: { role: 'admin' } } as any, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('super_admin-only rejects a plain admin', () => {
    const next = vi.fn();
    requireRole('super_admin')({ admin: { role: 'admin' } } as any, res, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});
