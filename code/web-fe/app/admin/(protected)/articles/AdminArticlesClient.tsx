'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Article } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminArticlesClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Article[]>('/admin/articles', { token });
      setArticles(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteArticle(id: number) {
    if (!confirm('Delete this article?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await api.delete(`/admin/articles/${id}`, { token });
      toast.success('Article deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) return <div className="text-text-muted">Loading articles…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Articles</h1>
        <Link href="/admin/articles/new">
          <Button size="sm"><Plus size={16} /> New Article</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No articles yet.</td></tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{article.title}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{article.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={article.isPublished ? 'success' : 'default'}>
                      {article.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{new Date(article.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/articles/${article.id}`}>
                        <Button variant="ghost" size="sm"><Pencil size={14} /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => deleteArticle(article.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
