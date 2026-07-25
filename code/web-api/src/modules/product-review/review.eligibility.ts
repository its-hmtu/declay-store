/**
 * Who may review a product (M-10 / BR-07). Pure + testable.
 * Only signed-in customers who actually bought the product, and only once —
 * this is what keeps fake reviews out.
 */
export interface EligibilityInput {
  isLoggedIn: boolean;
  hasPurchased: boolean;
  alreadyReviewed: boolean;
}

/** Reason the customer cannot review, or null when they can. */
export function reviewRejectionReason(input: EligibilityInput): string | null {
  if (!input.isLoggedIn) return 'Sign in to review this product.';
  if (input.alreadyReviewed) return 'You have already reviewed this product.';
  if (!input.hasPurchased) return 'You can only review a product you have purchased.';
  return null;
}

export function canReview(input: EligibilityInput): boolean {
  return reviewRejectionReason(input) === null;
}
