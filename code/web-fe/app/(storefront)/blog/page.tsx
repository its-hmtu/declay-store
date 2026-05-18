import type { Metadata } from 'next';
import Link from 'next/link';
import { articlesApi } from '@/lib/api';

export const metadata: Metadata = { title: 'Journal' };

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr ?? '1');

  let articles: Awaited<ReturnType<typeof articlesApi.list>>['data'] = [];
  let meta: Awaited<ReturnType<typeof articlesApi.list>>['meta'];
  try {
    const res = await articlesApi.list({ page, limit: 9 });
    articles  = res.data;
    meta      = res.meta;
  } catch { /* empty */ }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Journal</h1>
      <p className="text-text-muted mb-10">Stories, process notes, and inspiration from the studio.</p>

      {articles.length === 0 ? (
        <p className="text-text-muted py-20 text-center">No articles yet. Check back soon.</p>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group block rounded-xl border border-border bg-surface hover:border-brand-lighter transition-colors overflow-hidden"
              >
                {article.coverImage && (
                  <div className="aspect-video bg-surface-alt" />
                )}
                <div className="p-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
                    {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h2 className="font-serif font-semibold text-text group-hover:text-brand transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-2 text-sm text-text-muted line-clamp-3">{article.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/blog?page=${p}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
                    p === page
                      ? 'bg-brand text-white border-brand'
                      : 'border-border text-text-muted hover:border-brand hover:text-brand'
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
