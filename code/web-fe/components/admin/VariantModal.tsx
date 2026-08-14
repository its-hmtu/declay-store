'use client';

/**
 * M-48: create or edit one variant.
 *
 * A modal rather than another page: a variant only makes sense inside the product
 * being edited, and pushing a route would lose whatever is half-typed on the other
 * two tabs.
 *
 * The form is local until Save — the parent decides whether that means staging it
 * (product does not exist yet) or writing it straight away (editing).
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import Modal from './Modal';
import Button from '@/components/ui/Button';
import { uploadImage } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import { emptyVariantDraft, type VariantDraft } from '@/lib/product-variant-draft';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
const labelCls = 'mb-1 block text-xs';

export default function VariantModal({
  open,
  initial,
  onCancel,
  onSave,
}: {
  open: boolean;
  /** Undefined when adding; the existing draft when editing. */
  initial?: VariantDraft;
  onCancel: () => void;
  onSave: (draft: VariantDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<VariantDraft>(initial ?? emptyVariantDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reopening for a different variant must not show the previous one's values.
  useEffect(() => {
    if (open) setDraft(initial ?? emptyVariantDraft());
  }, [open, initial]);

  function set<K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const token = adminAuth.getToken();
    if (!file || !token) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, token);
      setDraft((d) => ({ ...d, images: [...d.images, url] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = ''; // allows re-picking the same file after a removal
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={initial?.id ? 'Edit variant' : 'Add variant'}
      description="Leave the name blank and it will be saved as Standard."
      size="lg"
      dismissable={!saving}
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label className={labelCls}>Images</Label>
          <div className="flex flex-wrap items-center gap-2">
            {draft.images.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => set('images', draft.images.filter((u) => u !== url))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-error p-0.5 text-white"
                  aria-label="Remove image"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted hover:border-brand hover:text-text">
              {uploading ? '…' : '+ Add'}
              <input type="file" accept="image/*" onChange={addImage} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label className={labelCls}>Variant name</Label>
            <Input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Standard"
            />
          </div>
          <div>
            <Label className={labelCls}>Price (₫) *</Label>
            <Input
              type="number" min={0} value={draft.price}
              onChange={(e) => set('price', e.target.value)} placeholder="450000"
            />
          </div>
          <div>
            <Label className={labelCls}>Special price (₫)</Label>
            <Input
              type="number" min={0} value={draft.specialPrice}
              onChange={(e) => set('specialPrice', e.target.value)} placeholder="Optional"
            />
          </div>
          <div>
            <Label className={labelCls}>Stock</Label>
            <Input
              type="number" min={0} value={draft.stock}
              onChange={(e) => set('stock', e.target.value)}
            />
          </div>
          <div>
            {/* Admin-only (BR-09). Without it the campaign margin warnings have
                nothing to judge against and silently pass everything. */}
            <Label className={labelCls}>
              Cost price (₫) <span className="text-text-faint">admin only</span>
            </Label>
            <Input
              type="number" min={0} value={draft.costPrice}
              onChange={(e) => set('costPrice', e.target.value)} placeholder="For margin"
            />
          </div>
        </div>

        <div>
          {/* Shipping fees are quoted by GHN from weight and dimensions — a blank
              here means the carrier prices the parcel on a guess. */}
          <p className="mb-2 text-xs font-medium text-text">Parcel</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className={labelCls}>Weight (g)</Label>
              <Input type="number" min={0} value={draft.weightGram}
                onChange={(e) => set('weightGram', e.target.value)} />
            </div>
            <div>
              <Label className={labelCls}>Length (cm)</Label>
              <Input type="number" min={0} value={draft.lengthCm}
                onChange={(e) => set('lengthCm', e.target.value)} />
            </div>
            <div>
              <Label className={labelCls}>Width (cm)</Label>
              <Input type="number" min={0} value={draft.widthCm}
                onChange={(e) => set('widthCm', e.target.value)} />
            </div>
            <div>
              <Label className={labelCls}>Height (cm)</Label>
              <Input type="number" min={0} value={draft.heightCm}
                onChange={(e) => set('heightCm', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
