'use client';

/**
 * M-48: loads the product, then hands it to the same tabbed form the create page
 * uses.
 *
 * Edit used to be a different screen: the product fields in one form, variants in
 * a separate list below with their own inline editor. That meant two mental models
 * for the same record, and the create page had no variant support at all — every
 * new product needed a second visit to become sellable.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { adminProductsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import ProductFormPage from '../ProductFormPage';
import PageHeader from '@/components/admin/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProductClient({ productId }: { productId: number }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    adminProductsApi
      .detail(token, productId)
      .then((res) => setProduct(res.data))
      .catch(() => toast.error('Product not found.'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return <PageHeader title="Product not found" description="It may have been deleted." />;
  }

  /**
   * `key` forces a fresh form when the id changes. Without it, navigating from one
   * product straight to another would keep the first product's state — the classic
   * "I edited the wrong record" bug.
   */
  return <ProductFormPage key={product.id} product={product} />;
}
