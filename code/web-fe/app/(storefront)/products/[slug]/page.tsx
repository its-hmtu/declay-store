import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { productsApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import ProductDetail from './ProductDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await productsApi.detail(slug);
    return { title: data.name, description: data.description };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const { data: product } = await productsApi.detail(slug);
    return <ProductDetail product={product} />;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}
