'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Article } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import ArticleForm from '../ArticleForm';

export default function EditArticleClient({ articleId }: { articleId: number }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Article>(`/admin/articles/${articleId}`, { token })
      .then((res) => setArticle(res.data))
      .catch(() => toast.error('Article not found.'))
      .finally(() => setLoading(false));
  }, [articleId]);

  if (loading) return <div className="text-text-muted">Loading…</div>;
  if (!article) return <div className="text-text-muted">Article not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-text">Edit Article</h1>
        <Link href="/admin/articles" className="text-sm text-brand hover:underline">&larr; Articles</Link>
      </div>
      <ArticleForm article={article} />
    </div>
  );
}
