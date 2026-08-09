'use client';

/**
 * M-48: the product create/edit screen, shared by `/new` and `/[id]`.
 *
 * Three tabs, because a product has three genuinely separate concerns and one
 * long scroll made it impossible to tell which fields mattered:
 *   Basic    — how the product is presented (images, name, category, description)
 *   Details  — what it costs and what it weighs
 *   Variants — sizes/colours, if there are any
 *
 * The Details tab doubles as the default variant. Declare nothing on the Variants
 * tab and those fields are saved as a variant named "Standard"; declare some and
 * they are used instead. Most pieces here are one size and one price, so making
 * every admin invent a variant would be friction with no payoff.
 *
 * Create vs edit differ on purpose:
 *   - Creating, variants are STAGED locally — there is no product id to hang them
 *     on until the product is written.
 *   - Editing, the variant modal writes immediately. Staging edits would mean
 *     reconciling creates, updates and deletes on save, and a half-applied
 *     reconciliation is how a live product loses the variant customers are buying.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Category, Product, ProductVariant } from '@/lib/types';
import { adminProductsApi, categoriesApi, uploadImage } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import FormPage from '@/components/admin/FormPage';
import VariantModal from '@/components/admin/VariantModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Checkbox } from '@/components/ui/checkbox';
import Button from '@/components/ui/Button';
import {
  emptyVariantDraft, resolveVariants, toVariantPayload, validateProductForm,
  DEFAULT_VARIANT_NAME, type VariantDraft,
} from '@/lib/product-variant-draft';
import { formatTableDate } from '@/lib/admin-table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';

type Tab = 'basic' | 'details' | 'variants';

const TABS: { id: Tab; label: string }[] = [
  { id: 'basic', label: 'Basic information' },
  { id: 'details', label: 'Details' },
  { id: 'variants', label: 'Variants' },
];
const labelCls = 'mb-1.5 block';

function variantToDraft(variant: ProductVariant): VariantDraft {
  return {
    id: variant.id,
    name: variant.name,
    price: String(variant.price ?? ''),
    specialPrice: variant.specialPrice != null ? String(variant.specialPrice) : '',
    stock: String(variant.stock ?? 0),
    costPrice: variant.costPrice != null ? String(variant.costPrice) : '',
    weightGram: variant.weightGram != null ? String(variant.weightGram) : '',
    lengthCm: variant.lengthCm != null ? String(variant.lengthCm) : '',
    widthCm: variant.widthCm != null ? String(variant.widthCm) : '',
    heightCm: variant.heightCm != null ? String(variant.heightCm) : '',
    images: variant.images ?? [],
  };
}

export default function ProductFormPage({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;

  const [tab, setTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ? String(product.categoryId) : '',
    isActive: product?.isActive ?? true,
  });

  /**
   * When editing, the first variant seeds the Details tab so the fields are not
   * blank on a product that plainly has a price. It is only WRITTEN back when the
   * product has no declared variants — see `resolveVariants`.
   */
  const existingVariants = useMemo(() => product?.variants ?? [], [product]);
  const isSingleStandard =
    existingVariants.length === 1 && existingVariants[0].name === DEFAULT_VARIANT_NAME;

  const [base, setBase] = useState<VariantDraft>(
    existingVariants[0] ? variantToDraft(existingVariants[0]) : emptyVariantDraft(),
  );

  // A lone "Standard" variant belongs to the Details tab, not the Variants list —
  // showing it in both places would invite the admin to edit the same thing twice.
  const [variants, setVariants] = useState<VariantDraft[]>(
    isSingleStandard ? [] : existingVariants.map(variantToDraft),
  );

  const [variantModal, setVariantModal] = useState<{ open: boolean; editing?: VariantDraft }>({ open: false });
  const [deleting, setDeleting] = useState<VariantDraft | null>(null);

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function autoSlug() {
    if (!form.slug && form.name) {
      setField('slug', form.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }

  async function addBaseImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const token = adminAuth.getToken();
    if (!file || !token) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, token);
      setBase((b) => ({ ...b, images: [...b.images, url] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  // ── Variants tab ────────────────────────────────────────────

  async function saveVariant(draft: VariantDraft) {
    const token = adminAuth.getToken();

    // Creating: stage it. There is no product id yet.
    if (!isEdit || !product) {
      setVariants((list) =>
        draft.id != null || variantModal.editing
          ? list.map((v) => (v === variantModal.editing ? draft : v))
          : [...list, draft],
      );
      setVariantModal({ open: false });
      return;
    }

    if (!token) return;
    try {
      if (draft.id) {
        await adminProductsApi.updateVariant(token, product.id, draft.id, toVariantPayload(draft));
        setVariants((list) => list.map((v) => (v.id === draft.id ? draft : v)));
        toast.success('Variant updated.');
      } else {
        const res = await adminProductsApi.createVariant(token, product.id, toVariantPayload(draft));
        setVariants((list) => [...list, { ...draft, id: res.data?.id }]);
        toast.success('Variant added.');
      }
      setVariantModal({ open: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the variant.');
    }
  }

  async function confirmDeleteVariant() {
    const token = adminAuth.getToken();
    if (!deleting) return;

    if (isEdit && product && deleting.id && token) {
      try {
        await adminProductsApi.removeVariant(token, product.id, deleting.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not delete the variant.');
        return;
      }
    }
    setVariants((list) => list.filter((v) => v !== deleting));
    setDeleting(null);
    toast.success('Variant removed.');
  }

  // ── Save ────────────────────────────────────────────────────

  async function submit() {
    const token = adminAuth.getToken();
    if (!token) return;

    const check = validateProductForm({ name: form.name, base, declared: variants });
    if (!check.valid) {
      // Send the admin to the tab holding the offending field — otherwise the
      // error names something they cannot see.
      if (check.tab) setTab(check.tab);
      toast.error(check.message ?? 'Please check the form.');
      return;
    }

    setSaving(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      isActive: form.isActive,
    };

    try {
      if (isEdit && product) {
        await adminProductsApi.update(token, product.id, body);

        // Variants were written as they were edited; the only thing left is the
        // Standard fallback for a product that still has none.
        if (variants.length === 0) {
          const [payload] = resolveVariants(base, []);
          const current = existingVariants[0];
          if (current) await adminProductsApi.updateVariant(token, product.id, current.id, payload);
          else await adminProductsApi.createVariant(token, product.id, payload);
        }
        toast.success('Product updated.');
      } else {
        const created = await adminProductsApi.create(token, body);
        const newId = created.data?.id;
        if (!newId) throw new Error('The server did not return the new product.');

        /**
         * Sequential, not parallel: variant creation validates against the
         * product, and a burst of parallel writes makes a partial failure much
         * harder to explain to the admin.
         */
        for (const payload of resolveVariants(base, variants)) {
          await adminProductsApi.createVariant(token, newId, payload);
        }
        toast.success('Product created.');
      }
      router.push('/admin/products');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FormPage
        title={isEdit ? `Edit ${product?.name ?? 'product'}` : 'New product'}
        description={
          isEdit
            ? undefined
            : 'Fill in the first two tabs and the product is ready to sell — variants are optional.'
        }
        onSubmit={submit}
        onCancel={() => router.push('/admin/products')}
        saving={saving}
        saveLabel={isEdit ? 'Save changes' : 'Create product'}
      >
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-brand text-text'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {t.label}
                {t.id === 'variants' && variants.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-surface-alt px-1.5 py-0.5 text-[11px] text-text-muted">
                    {variants.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Tab 1: basic information ───────────────────── */}
        {tab === 'basic' && (
          <Card className="space-y-5 p-5 py-5">
            <div>
              <Label className={labelCls}>Images</Label>
              <div className="flex flex-wrap items-center gap-2">
                {base.images.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => setBase((b) => ({ ...b, images: b.images.filter((u) => u !== url) }))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-error p-0.5 text-white"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted hover:border-brand hover:text-text">
                  {uploading ? 'Uploading…' : '+ Add image'}
                  <input type="file" accept="image/*" onChange={addBaseImage} disabled={uploading} className="hidden" />
                </label>
              </div>
              <p className="mt-1.5 text-xs text-text-faint">
                {variants.length > 0
                  ? 'Used for the product when a variant has no image of its own.'
                  : 'Saved with the Standard variant.'}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className={labelCls} htmlFor="name">Name *</Label>
                <Input
                  id="name" value={form.name} onBlur={autoSlug}
                  onChange={(e) => setField('name', e.target.value)} placeholder="Tiny Dragon"
                />
              </div>
              <div>
                <Label className={labelCls} htmlFor="slug">Slug</Label>
                <Input
                  id="slug" value={form.slug}
                  onChange={(e) => setField('slug', e.target.value)} placeholder="auto from name if blank"
                 className="font-mono text-sm" />
              </div>
            </div>

            <div>
              <Label className={labelCls} htmlFor="categoryId">Category</Label>
              <NativeSelect
                id="categoryId" value={form.categoryId}
                onChange={(e) => setField('categoryId', e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </div>

            <div>
              <Label className={labelCls} htmlFor="description">Description</Label>
              <Textarea
                id="description" rows={8} value={form.description}
                onChange={(e) => setField('description', e.target.value)} placeholder="Describe the piece…"
               className="resize-y" />
            </div>

            <div className="flex items-center gap-3">
        <Checkbox id="cb-isactive"
                checked={form.isActive}
                onCheckedChange={(v) => setField('isActive', v === true)}
              />
        <Label htmlFor="cb-isactive" className="text-sm font-medium text-text cursor-pointer font-normal">Published (visible in the storefront)</Label>
      </div>
          </Card>
        )}

        {/* ── Tab 2: details ─────────────────────────────── */}
        {tab === 'details' && (
          <Card className="space-y-5 p-5 py-5">
            {variants.length > 0 && (
              <p className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs text-text-muted">
                This product has {variants.length} variant{variants.length > 1 ? 's' : ''}, so price and stock
                come from the Variants tab. These fields are not used.
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Label className={labelCls}>Price (₫) *</Label>
                <Input
                  type="number" min={0} value={base.price}
                  onChange={(e) => setBase((b) => ({ ...b, price: e.target.value }))} placeholder="450000"
                />
              </div>
              <div>
                <Label className={labelCls}>Special price (₫)</Label>
                <Input
                  type="number" min={0} value={base.specialPrice}
                  onChange={(e) => setBase((b) => ({ ...b, specialPrice: e.target.value }))} placeholder="Optional"
                />
              </div>
              <div>
                <Label className={labelCls}>Stock</Label>
                <Input
                  type="number" min={0} value={base.stock}
                  onChange={(e) => setBase((b) => ({ ...b, stock: e.target.value }))}
                />
              </div>
              <div>
                {/* Admin-only (BR-09). The campaign margin preview has nothing to
                    judge against without it, so it quietly approves every discount. */}
                <Label className={labelCls}>
                  Cost price (₫) <span className="text-text-faint">admin only</span>
                </Label>
                <Input
                  type="number" min={0} value={base.costPrice}
                  onChange={(e) => setBase((b) => ({ ...b, costPrice: e.target.value }))} placeholder="Drives margin warnings"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-text">Parcel</p>
              <p className="mb-3 text-xs text-text-muted">
                GHN quotes the shipping fee from these. Leave them blank and the carrier prices the parcel on a guess.
              </p>
              <div className="grid gap-4 sm:grid-cols-4">
                {([
                  ['weightGram', 'Weight (g)'],
                  ['lengthCm', 'Length (cm)'],
                  ['widthCm', 'Width (cm)'],
                  ['heightCm', 'Height (cm)'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <Label className={labelCls}>{label}</Label>
                    <Input
                      type="number" min={0} value={base[key]}
                      onChange={(e) => setBase((b) => ({ ...b, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Tab 3: variants ────────────────────────────── */}
        {tab === 'variants' && (
          <Card className="">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-medium text-text">Variants</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Leave this empty and the Details tab is saved as a single
                  &ldquo;{DEFAULT_VARIANT_NAME}&rdquo; variant.
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => setVariantModal({ open: true })}>
                <Plus size={15} /> Add variant
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-text-muted">
                No variants — this product will be sold as {DEFAULT_VARIANT_NAME}.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Price</th>
                    <th className="px-4 py-3 text-left font-medium">Special</th>
                    <th className="px-4 py-3 text-left font-medium">Stock</th>
                    <th className="px-4 py-3 text-left font-medium">Parcel</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.id ?? `staged-${index}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-text">
                        {variant.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={variant.images[0]} alt="" className="mr-2 inline-block h-8 w-8 rounded object-cover align-middle" />
                        )}
                        {variant.name || DEFAULT_VARIANT_NAME}
                      </td>
                      <td className="px-4 py-3 text-text">{variant.price || '—'}</td>
                      <td className="px-4 py-3 text-text-muted">{variant.specialPrice || '—'}</td>
                      <td className="px-4 py-3 text-text-muted">{variant.stock || '0'}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {variant.weightGram ? `${variant.weightGram}g` : '—'}
                        {variant.lengthCm && ` · ${variant.lengthCm}×${variant.widthCm}×${variant.heightCm}cm`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setVariantModal({ open: true, editing: variant })}
                          className="p-1.5 text-text-muted hover:text-brand"
                          aria-label="Edit variant"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(variant)}
                          className="p-1.5 text-text-muted hover:text-error"
                          aria-label="Delete variant"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isEdit && product && (
              <p className="border-t border-border px-5 py-3 text-xs text-text-faint">
                Variant changes are saved immediately. Created {formatTableDate(product.createdAt)}.
              </p>
            )}
          </Card>
        )}
      </FormPage>

      <VariantModal
        open={variantModal.open}
        initial={variantModal.editing}
        onCancel={() => setVariantModal({ open: false })}
        onSave={saveVariant}
      />

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDeleteVariant}
        title="Delete this variant?"
        message={<>Delete <strong>{deleting?.name || DEFAULT_VARIANT_NAME}</strong>?</>}
        warning={
          isEdit
            ? 'This happens straight away and cannot be undone. Past orders keep their own price snapshot.'
            : undefined
        }
      />
    </>
  );
}
