/**
 * Who may see cost price / margin (M-04, BR-09).
 * Only admin and super_admin — never staff (editor), never the storefront.
 */
export type AdminRole = 'super_admin' | 'admin' | 'editor';

export function canSeeCost(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** Strip cost/margin from an object unless the role is allowed to see them. */
export function stripCostFields<T extends Record<string, unknown>>(row: T, role?: string | null): T {
  if (canSeeCost(role)) return row;
  const { costPrice, margin, marginPercent, ...rest } = row as Record<string, unknown>;
  void costPrice; void margin; void marginPercent;
  return rest as T;
}
