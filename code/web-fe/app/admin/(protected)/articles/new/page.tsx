import type { Metadata } from 'next';
import ArticleForm from '../ArticleForm';

export const metadata: Metadata = { title: 'New Article' };

export default function NewArticlePage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-8">New Article</h1>
      <ArticleForm />
    </div>
  );
}
