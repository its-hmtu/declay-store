/**
 * MVP feature flags (M-09). Trim the surface to focus on the validation goal.
 * Flip a flag to `true` to bring a deferred feature back into the UI.
 */
export const FEATURES = {
  collections: true,
  blog: true,
  careers: true,
  wishlist: true,
  chat: true,
  campaigns: true,
  banners: true,
  articles: true,
  jobs: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Item with no feature key is always visible; otherwise gated by the flag. */
export function isEnabled(key?: FeatureKey): boolean {
  return key ? FEATURES[key] : true;
}
