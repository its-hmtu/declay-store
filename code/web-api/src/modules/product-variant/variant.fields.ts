/**
 * Fields that must never reach the storefront or non-admin roles (M-03/M-04, BR-09).
 * Use PUBLIC_VARIANT_ATTRIBUTES on every include that can be read by a customer.
 */
export const SENSITIVE_VARIANT_FIELDS = ['costPrice'] as const;

export const PUBLIC_VARIANT_ATTRIBUTES = {
  exclude: [...SENSITIVE_VARIANT_FIELDS] as string[],
};
