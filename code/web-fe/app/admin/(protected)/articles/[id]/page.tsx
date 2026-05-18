import type { Metadata } from 'next';
import EditArticleClient from './EditArticleClient';

export const metadata: Metadata = { title: 'Edit Article' };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditArticleClient articleId={Number(id)} />;
}
