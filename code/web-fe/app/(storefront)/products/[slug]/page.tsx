import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { productsApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import { effectivePrice, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';
import ProductDetail from './ProductDetail';

/** Cheapest live price across variants — what a shared link should advertise. */
function displayPrice(product: Product): number | null {
  const prices = (product.variants ?? [])
    .filter((v) => v.isActive)
    .map((v) => effectivePrice(v, product.campaignDiscountPercent));
  return prices.length ? Math.min(...prices) : null;
}

function firstImage(product: Product): string | undefined {
  for (const v of product.variants ?? []) {
    const img = v.images?.find((src) => src.startsWith('http'));
    if (img) return img;
  }
  return undefined;
}

// M-08: rich Open Graph / Twitter cards so links shared on FB, IG and TikTok
// render with the product photo, name and price.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await productsApi.detail(slug);
    const price = displayPrice(data);
    const image = firstImage(data);
    const description = data.description
      ?? `${data.name}${price !== null ? ` — ${formatPrice(price)}` : ''} · Handmade by Declay.`;

    return {
      title: data.name,
      description,
      alternates: { canonical: `/products/${data.slug}` },
      openGraph: {
        type: 'website',
        title: data.name,
        description,
        url: `/products/${data.slug}`,
        siteName: 'Declay Store',
        ...(image ? { images: [{ url: image, alt: data.name }] } : {}),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title: data.name,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
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
    const price = displayPrice(product);
    const image = firstImage(product);
    const inStock = (product.variants ?? []).some((v) => v.isActive && v.stock > 0);

    // Structured data helps search engines and social crawlers show price/availability.
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description ?? undefined,
      ...(image ? { image: [image] } : {}),
      ...(price !== null
        ? {
            offers: {
              '@type': 'Offer',
              price: price.toFixed(2),
              priceCurrency: 'USD',
              availability: inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          }
        : {}),
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetail product={product} />
      </>
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}
