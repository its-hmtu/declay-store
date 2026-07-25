import { describe, it, expect } from 'vitest';
import { canReview, reviewRejectionReason } from '@/modules/product-review/review.eligibility';

const base = { isLoggedIn: true, hasPurchased: true, alreadyReviewed: false };

describe('review eligibility (M-10 / BR-07)', () => {
  it('allows a signed-in buyer who has not reviewed yet', () => {
    expect(canReview(base)).toBe(true);
    expect(reviewRejectionReason(base)).toBeNull();
  });
  it('asks guests to sign in first', () => {
    expect(reviewRejectionReason({ ...base, isLoggedIn: false })).toContain('Sign in');
  });
  it('blocks a second review of the same product', () => {
    expect(reviewRejectionReason({ ...base, alreadyReviewed: true })).toContain('already reviewed');
  });
  it('blocks customers who never bought the product', () => {
    expect(reviewRejectionReason({ ...base, hasPurchased: false })).toContain('only review a product you have purchased');
  });
  it('prioritises the sign-in prompt over other reasons', () => {
    expect(reviewRejectionReason({ isLoggedIn: false, hasPurchased: false, alreadyReviewed: true }))
      .toContain('Sign in');
  });
});
