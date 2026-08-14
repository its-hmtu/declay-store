'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/api';
import { adminAuth } from '@/lib/auth';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;        // max images (default 10)
  multiple?: boolean;  // allow selecting multiple at once (default true)
}

export default function ImageUploader({ value, onChange, max = 10, multiple = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const token = adminAuth.getToken();
    if (!token) { toast.error('Not signed in.'); return; }

    const remaining = max - value.length;
    const picked = Array.from(files).slice(0, Math.max(remaining, 0));
    if (picked.length === 0) { toast.error(`Up to ${max} images.`); return; }

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of picked) {
        urls.push(await uploadImage(file, token));
      }
      onChange([...value, ...urls]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  const atLimit = value.length >= max;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative size-20 rounded-lg overflow-hidden border border-border bg-surface-alt group">
            {/* plain img — these are admin previews, not optimized storefront images */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-0.5 right-0.5 size-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="size-20 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong text-text-faint hover:text-brand hover:border-brand transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            <span className="text-[10px]">{busy ? 'Uploading' : 'Upload'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-1.5 text-xs text-text-faint">PNG, JPEG, WebP or GIF · max 5MB each · up to {max}</p>
    </div>
  );
}
