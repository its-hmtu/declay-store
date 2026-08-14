import { describe, it, expect } from 'vitest';
import { authLimiter, chatLimiter, assistantLimiter } from '@/middlewares/rate-limit.middleware';

describe('rate limiters (W-10)', () => {
  it('all three are express middleware functions', () => {
    for (const mw of [authLimiter, chatLimiter, assistantLimiter]) {
      expect(typeof mw).toBe('function');
      expect(mw.length).toBeGreaterThanOrEqual(2); // (req, res, next)
    }
  });
});
