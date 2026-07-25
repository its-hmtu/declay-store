import { describe, it, expect } from 'vitest';
import { resolveCartOwner, ownerWhere, isUserOwner } from '@/modules/cart/cart.owner';

describe('resolveCartOwner (M-01)', () => {
  it('prefers the logged-in user over a guest session', () => {
    expect(resolveCartOwner(7, 'guest-session-abc123')).toEqual({ userId: 7 });
  });
  it('falls back to the guest session when there is no user', () => {
    expect(resolveCartOwner(null, 'guest-session-abc123')).toEqual({ sessionId: 'guest-session-abc123' });
  });
  it('rejects missing or too-short session ids', () => {
    expect(resolveCartOwner(null, null)).toBeNull();
    expect(resolveCartOwner(null, 'short')).toBeNull();
    expect(resolveCartOwner(null, '   ')).toBeNull();
  });
});

describe('ownerWhere / isUserOwner', () => {
  it('builds the right where clause', () => {
    expect(ownerWhere({ userId: 3 })).toEqual({ userId: 3 });
    expect(ownerWhere({ sessionId: 'sess-12345678' })).toEqual({ sessionId: 'sess-12345678' });
  });
  it('narrows the owner type', () => {
    expect(isUserOwner({ userId: 1 })).toBe(true);
    expect(isUserOwner({ sessionId: 'sess-12345678' })).toBe(false);
  });
});
