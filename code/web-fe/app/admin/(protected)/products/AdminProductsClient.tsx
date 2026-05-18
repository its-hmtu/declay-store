'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Product[]>('/admin/products', { token })
      .then((res) => setProducts(res.data))
      .catch(() => toast.error('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-muted">Loading products…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={16} /> New Product
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Variants</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No products yet.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{product.name}</td>
                  <td className="px-4 py-3 text-text-muted">{product.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{product.variants?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.isActive ? 'success' : 'default'}>
                      {product.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="ghost" size="sm"><Pencil size={14} /></Button>
                    </Link>
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
