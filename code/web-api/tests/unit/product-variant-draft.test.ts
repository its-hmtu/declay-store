/**
 * The "no variants means Standard" rule lives in the frontend
 * (`web-fe/lib/product-variant-draft.ts`). Imported by relative path — getting
 * this wrong produces a product that exists but cannot be bought, because nothing
 * is purchasable without at least one variant.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyVariantDraft, toVariantPayload, resolveVariants, validateProductForm,
  DEFAULT_VARIANT_NAME, type VariantDraft,
} from '../../../web-fe/lib/product-variant-draft';

function draft(over: Partial<VariantDraft> = {}): VariantDraft {
  return { ...emptyVariantDraft(), price: '100000', ...over };
}

describe('toVariantPayload', () => {
  it('falls back to Standard when the name is blank', () => {
    expect(toVariantPayload(draft({ name: '   ' })).name).toBe(DEFAULT_VARIANT_NAME);
  });

  it('converts numeric fields and nulls the empty ones', () => {
    const payload = toVariantPayload(draft({ price: '450000', stock: '7', weightGram: '250' }));
    expect(payload.price).toBe(450000);
    expect(payload.stock).toBe(7);
    expect(payload.weightGram).toBe(250);
    // null, not undefined: on edit this must CLEAR a previous value rather than
    // leave the old one in place.
    expect(payload.specialPrice).toBeNull();
    expect(payload.lengthCm).toBeNull();
  });

  it('keeps cost price, which the campaign margin warnings depend on', () => {
    expect(toVariantPayload(draft({ costPrice: '200000' })).costPrice).toBe(200000);
    expect(toVariantPayload(draft({ costPrice: '' })).costPrice).toBeNull();
  });

  it('treats unparseable input as absent rather than NaN', () => {
    expect(toVariantPayload(draft({ weightGram: 'abc' })).weightGram).toBeNull();
  });
});

describe('resolveVariants', () => {
  it('creates a single Standard variant when none are declared', () => {
    const result = resolveVariants(draft({ price: '450000', stock: '3' }), []);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(DEFAULT_VARIANT_NAME);
    expect(result[0].price).toBe(450000);
  });

  it('uses the declared variants and ignores the base fields', () => {
    // A leftover default appearing next to real variants would be a phantom SKU.
    const result = resolveVariants(
      draft({ price: '999999' }),
      [draft({ name: 'Small', price: '100000' }), draft({ name: 'Large', price: '200000' })],
    );
    expect(result.map((v) => v.name)).toEqual(['Small', 'Large']);
    expect(result.some((v) => v.price === 999999)).toBe(false);
  });

  it('carries the base images onto the Standard variant', () => {
    const result = resolveVariants(draft({ images: ['a.jpg', 'b.jpg'] }), []);
    expect(result[0].images).toEqual(['a.jpg', 'b.jpg']);
  });
});

describe('validateProductForm', () => {
  const base = draft();

  it('requires a name and points at the tab holding it', () => {
    const result = validateProductForm({ name: '  ', base, declared: [] });
    expect(result.valid).toBe(false);
    expect(result.tab).toBe('basic');
  });

  it('requires a price when there are no variants', () => {
    const result = validateProductForm({ name: 'Dragon', base: draft({ price: '' }), declared: [] });
    expect(result.valid).toBe(false);
    expect(result.tab).toBe('details');
    expect(result.message).toMatch(/price|variant/i);
  });

  it('does NOT require the base price once variants exist', () => {
    // The Details tab is unused in that case, so demanding it would block a
    // perfectly valid product on a field the form says is irrelevant.
    const result = validateProductForm({
      name: 'Dragon',
      base: draft({ price: '' }),
      declared: [draft({ name: 'Small', price: '100000' })],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a special price that is not actually lower', () => {
    const result = validateProductForm({
      name: 'Dragon',
      base: draft({ price: '100000', specialPrice: '100000' }),
      declared: [],
    });
    expect(result.valid).toBe(false);
    expect(result.tab).toBe('details');
  });

  it('names the offending variant, since the field may be off screen', () => {
    const result = validateProductForm({
      name: 'Dragon',
      base,
      declared: [draft({ name: 'Small', price: '100000' }), draft({ name: 'Large', price: '0' })],
    });
    expect(result.valid).toBe(false);
    expect(result.tab).toBe('variants');
    expect(result.message).toContain('Large');
  });

  it('rejects duplicate variant names', () => {
    const result = validateProductForm({
      name: 'Dragon',
      base,
      declared: [draft({ name: 'Small', price: '1' }), draft({ name: ' small ', price: '2' })],
    });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/unique/i);
  });

  it('accepts the simplest possible product', () => {
    expect(validateProductForm({ name: 'Dragon', base, declared: [] }).valid).toBe(true);
  });
});
