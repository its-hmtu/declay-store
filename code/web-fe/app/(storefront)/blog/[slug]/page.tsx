import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { articlesApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await articlesApi.detail(slug);
    return { title: data.title, description: data.excerpt };
  } catch {
    return { title: 'Article not found' };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article: Awaited<ReturnType<typeof articlesApi.detail>>['data'];
  try {
    const res = await articlesApi.detail(slug);
    article   = res.data;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/blog" className="text-sm text-brand hover:underline mb-6 inline-block">
        &larr; Journal
      </Link>

      <p className="text-sm text-text-muted uppercase tracking-wider mb-3">
        {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <h1 className="font-serif text-4xl md:text-5xl font-bold text-text leading-tight">
        {article.title}
      </h1>

      {article.excerpt && (
        <p className="mt-4 text-lg text-text-muted leading-relaxed border-l-4 border-brand-lighter pl-4">
          {article.excerpt}
        </p>
      )}

      <div
        className="mt-10 prose prose-stone max-w-none
          prose-headings:font-serif prose-headings:text-text
          prose-p:text-text-muted prose-p:leading-relaxed
          prose-a:text-brand prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </div>
  );
}
