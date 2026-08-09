/**
 * M-48: the rule that lets a product be created without thinking about variants.
 *
 * Most pieces in this shop are one size, one price. Forcing the admin to invent a
 * variant for every one of them is friction with no payoff — so the fields on the
 * "Details" tab (price, stock, weight, parcel size) double as a variant. Declare
 * none and they become a variant literally named "Standard"; declare some and
 * they are used instead.
 *
 * Pure, so the fallback can be tested — getting it wrong means a product that
 * exists in the catalogue but cannot be bought, because nothing is purchasable
 * without at least one variant.
 */

export const DEFAULT_VARIANT_NAME = 'Standard';

export interface VariantDraft {
  /** Present once the variant exists server-side; absent while staged locally. */
  id?: number;
  name: string;
  price: string;
  specialPrice: string;
  stock: string;
  /** Admin-only (BR-09). Feeds margin display and the campaign margin warnings. */
  costPrice: string;
  weightGram: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  images: string[];
}

export function emptyVariantDraft(name = ''): VariantDraft {
  return {
    name,
    price: '',
    specialPrice: '',
    stock: '0',
    costPrice: '',
    weightGram: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    images: [],
  };
}

/** '' → undefined so an untouched optional field is omitted, not sent as 0. */
function num(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface VariantPayload {
  name: string;
  price: number;
  specialPrice?: number | null;
  stock?: number;
  costPrice?: number | null;
  weightGram?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  images?: string[];
}

export function toVariantPayload(draft: VariantDraft): VariantPayload {
  return {
    name: draft.name.trim() || DEFAULT_VARIANT_NAME,
    price: num(draft.price) ?? 0,
    // null clears a special price on edit; undefined would leave the old one.
    specialPrice: num(draft.specialPrice) ?? null,
    stock: num(draft.stock) ?? 0,
    costPrice: num(draft.costPrice) ?? null,
    weightGram: num(draft.weightGram) ?? null,
    lengthCm: num(draft.lengthCm) ?? null,
    widthCm: num(draft.widthCm) ?? null,
    heightCm: num(draft.heightCm) ?? null,
    images: draft.images,
  };
}

/**
 * Which variants to write for this product.
 *
 * `base` holds the Details-tab fields. It is used only when the admin declared no
 * variants of their own — otherwise their list wins and `base` is ignored, so a
 * leftover default cannot appear alongside real variants.
 */
export function resolveVariants(base: VariantDraft, declared: VariantDraft[]): VariantPayload[] {
  if (declared.length > 0) return declared.map(toVariantPayload);
  return [toVariantPayload({ ...base, name: base.name.trim() || DEFAULT_VARIANT_NAME })];
}

export interface ValidationResult {
  valid: boolean;
  /** Which tab to switch to so the admin can see the problem they must fix. */
  tab?: 'basic' | 'details' | 'variants';
  message?: string;
}

/**
 * Validate before any request goes out.
 *
 * The message says which tab is at fault because a form with hidden tabs can fail
 * on a field that is not on screen — an error toast with no way to find the field
 * is worse than no validation.
 */
export function validateProductForm(input: {
  name: string;
  base: VariantDraft;
  declared: VariantDraft[];
}): ValidationResult {
  if (!input.name.trim()) {
    return { valid: false, tab: 'basic', message: 'Product name is required.' };
  }

  if (input.declared.length === 0) {
    const price = num(input.base.price);
    if (price == null || price <= 0) {
      return {
        valid: false,
        tab: 'details',
        message: 'Enter a price, or add at least one variant on the Variants tab.',
      };
    }
    const special = num(input.base.specialPrice);
    if (special != null && special >= price) {
      return { valid: false, tab: 'details', message: 'Special price must be lower than the price.' };
    }
    return { valid: true };
  }

  for (const [index, variant] of input.declared.entries()) {
    const label = variant.name.trim() || `Variant ${index + 1}`;
    const price = num(variant.price);
    if (price == null || price <= 0) {
      return { valid: false, tab: 'variants', message: `"${label}" needs a price greater than 0.` };
    }
    const special = num(variant.specialPrice);
    if (special != null && special >= price) {
      return {
        valid: false,
        tab: 'variants',
        message: `"${label}": special price must be lower than the price.`,
      };
    }
  }

  // Duplicate names make the storefront's variant picker ambiguous.
  const names = input.declared.map((v) => v.name.trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) {
    return { valid: false, tab: 'variants', message: 'Variant names must be unique.' };
  }

  return { valid: true };
}
