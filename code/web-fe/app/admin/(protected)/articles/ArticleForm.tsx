'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Article } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

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

  const inputCls = 'w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint';
  const labelCls = 'block text-sm font-medium text-text mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="title">Title *</label>
          <input id="title" name="title" required value={form.title} onChange={handleChange} onBlur={autoSlug} className={inputCls} placeholder="Making a clay dragon" />
        </div>
        <div>
          <label className={labelCls} htmlFor="slug">Slug *</label>
          <input id="slug" name="slug" required value={form.slug} onChange={handleChange} className={inputCls} placeholder="making-a-clay-dragon" />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="excerpt">Excerpt</label>
        <input id="excerpt" name="excerpt" value={form.excerpt} onChange={handleChange} className={inputCls} placeholder="Short summary shown in listings…" />
      </div>

      <div>
        <label className={labelCls} htmlFor="coverImage">Cover Image URL</label>
        <input id="coverImage" name="coverImage" type="url" value={form.coverImage} onChange={handleChange} className={inputCls} placeholder="https://…" />
      </div>

      <div>
        <label className={labelCls} htmlFor="content">Content (HTML or Markdown) *</label>
        <textarea
          id="content" name="content" required rows={16}
          value={form.content} onChange={handleChange}
          className={`${inputCls} resize-y font-mono text-sm`}
          placeholder="<p>Your article content here…</p>"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} className="w-4 h-4 accent-brand" />
        <span className="text-sm font-medium text-text">Published (visible in storefront)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Article'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
