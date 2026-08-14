'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Article } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import ImageUploader from '@/components/admin/ImageUploader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Props { article?: Article }

export default function ArticleForm({ article }: Props) {
  const router = useRouter();
  const isEdit = !!article;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title:       article?.title       ?? '',
    slug:        article?.slug        ?? '',
    excerpt:     article?.excerpt     ?? '',
    content:     article?.content     ?? '',
    coverImage:  article?.coverImage  ?? '',
    isPublished: article?.isPublished ?? false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  }

  function autoSlug() {
    if (!form.slug && form.title) setForm((f) => ({ ...f, slug: f.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/admin/articles/${article.id}`, form, { token });
        toast.success('Article saved.');
      } else {
        await api.post('/admin/articles', form, { token });
        toast.success('Article created.');
        router.push('/admin/articles');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }
  const labelCls = 'mb-1.5 block';

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label className={labelCls} htmlFor="title">Title *</Label>
          <Input id="title" name="title" required value={form.title} onChange={handleChange} onBlur={autoSlug} placeholder="Making a clay dragon" />
        </div>
        <div>
          <Label className={labelCls} htmlFor="slug">Slug *</Label>
          <Input id="slug" name="slug" required value={form.slug} onChange={handleChange} placeholder="making-a-clay-dragon" />
        </div>
      </div>

      <div>
        <Label className={labelCls} htmlFor="excerpt">Excerpt</Label>
        <Input id="excerpt" name="excerpt" value={form.excerpt} onChange={handleChange} placeholder="Short summary shown in listings…" />
      </div>

      <div>
        <Label className={labelCls}>Cover Image</Label>
        <ImageUploader
          value={form.coverImage ? [form.coverImage] : []}
          onChange={(urls) => setForm((f) => ({ ...f, coverImage: urls[0] ?? '' }))}
          multiple={false}
          max={1}
        />
      </div>

      <div>
        <Label className={labelCls} htmlFor="content">Content (HTML or Markdown) *</Label>
        <Textarea
          id="content" name="content" required rows={16}
          value={form.content} onChange={handleChange}
          className="resize-y font-mono text-sm"
          placeholder="<p>Your article content here…</p>"
        />
      </div>

      <div className="flex items-center gap-3">
        <Checkbox id="cb-ispublished" checked={form.isPublished} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: v === true }))} />
        <Label htmlFor="cb-ispublished" className="text-sm font-medium text-text cursor-pointer font-normal">Published (visible in storefront)</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Article'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
