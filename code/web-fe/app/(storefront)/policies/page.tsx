import type { Metadata } from 'next';
import { pagesApi } from '@/lib/api';
import type { Page } from '@/lib/types';

export const metadata: Metadata = { title: 'Store Policies' };

export default async function PoliciesPage() {
  let page: Page | null = null;
  try {
    page = (await pagesApi.getBySlug('policies')).data;
  } catch {
    page = null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">{page?.title ?? 'Store Policies'}</h1>
      {page?.effectiveDate && (
        <p className="text-text-faint text-sm mb-8">Effective date: {page.effectiveDate}</p>
      )}
      {page ? (
        <div
          className="mt-6 prose prose-stone max-w-none
            prose-headings:font-serif prose-headings:text-text
            prose-p:text-text-muted prose-p:leading-relaxed
            prose-a:text-brand prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : (
        <p className="text-text-muted">This page is being updated. Please check back soon.</p>
      )}
    </div>
  );
}
