import { describe, it, expect } from 'vitest';
import { normalizeGuestContact, generateGuestToken } from '@/modules/order/order.guest';

describe('normalizeGuestContact (M-01)', () => {
  it('trims and lowercases a valid contact', () => {
    expect(normalizeGuestContact({ name: '  Lan Anh ', email: ' LAN@Example.COM ', phone: ' 0901 234 567 ' }))
      .toEqual({ name: 'Lan Anh', email: 'lan@example.com', phone: '0901 234 567' });
  });
  it('rejects a missing or too-short name', () => {
    expect(normalizeGuestContact({ name: 'A', email: 'a@b.co', phone: '0901234567' })).toBeNull();
    expect(normalizeGuestContact({ email: 'a@b.co', phone: '0901234567' })).toBeNull();
  });
  it('rejects an invalid email', () => {
    expect(normalizeGuestContact({ name: 'Lan Anh', email: 'not-an-email', phone: '0901234567' })).toBeNull();
  });
  it('rejects an invalid phone', () => {
    expect(normalizeGuestContact({ name: 'Lan Anh', email: 'a@b.co', phone: '123' })).toBeNull();
    expect(normalizeGuestContact({ name: 'Lan Anh', email: 'a@b.co', phone: 'call-me' })).toBeNull();
  });
  it('rejects null input', () => {
    expect(normalizeGuestContact(null)).toBeNull();
  });
});

describe('generateGuestToken', () => {
  it('returns a long, unique hex token', () => {
    const a = generateGuestToken();
    const b = generateGuestToken();
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });
});
