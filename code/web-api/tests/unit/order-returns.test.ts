import { describe, it, expect } from 'vitest';
import { canReturn, returnRejectionReason, returnDeadline, RETURN_WINDOW_DAYS } from '@/modules/order/order.returns';

const delivered = new Date('2026-07-10T00:00:00Z');

describe('return window (M-06 / BR-06)', () => {
  it('allows a return inside the 7-day window', () => {
    expect(canReturn('delivered', delivered, new Date('2026-07-13T00:00:00Z'))).toBe(true);
  });
  it('allows a return exactly on the deadline', () => {
    expect(canReturn('delivered', delivered, returnDeadline(delivered))).toBe(true);
  });
  it('rejects a return after the window closes', () => {
    expect(canReturn('delivered', delivered, new Date('2026-07-18T00:00:00Z'))).toBe(false);
    expect(returnRejectionReason('delivered', delivered, new Date('2026-07-18T00:00:00Z')))
      .toContain('return window closed');
  });
  it('rejects orders that are not delivered yet', () => {
    expect(canReturn('shipped', null)).toBe(false);
    expect(returnRejectionReason('processing', null)).toContain('Only delivered orders');
  });
  it('rejects a second return', () => {
    expect(returnRejectionReason('returned', delivered, new Date('2026-07-11T00:00:00Z')))
      .toContain('already been returned');
  });
  it('rejects when no delivery date was recorded', () => {
    expect(returnRejectionReason('delivered', null)).toContain('no delivery date');
  });
  it('uses a 7-day window by default', () => {
    expect(RETURN_WINDOW_DAYS).toBe(7);
    expect(returnDeadline(delivered).toISOString()).toBe('2026-07-17T00:00:00.000Z');
  });
});
