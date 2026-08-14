import { describe, it, expect } from 'vitest';
import { sanitizeAuditBody } from '@/middlewares/audit.middleware';

describe('sanitizeAuditBody (W-09)', () => {
  it('redacts sensitive keys, keeps the rest', () => {
    const out = sanitizeAuditBody({
      email: 'a@b.com', password: 'secret', apiToken: 'xyz', cardNumber: '4242', name: 'Figure',
    }) as Record<string, unknown>;
    expect(out.email).toBe('a@b.com');
    expect(out.name).toBe('Figure');
    expect(out.password).toBe('[redacted]');
    expect(out.apiToken).toBe('[redacted]');
    expect(out.cardNumber).toBe('[redacted]');
  });

  it('passes non-object values through unchanged', () => {
    expect(sanitizeAuditBody('hello')).toBe('hello');
    expect(sanitizeAuditBody(null)).toBe(null);
    expect(sanitizeAuditBody(42)).toBe(42);
  });
});
