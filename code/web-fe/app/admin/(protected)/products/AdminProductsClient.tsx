'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AdminToolbar, { FilterSelect } from '@/components/admin/AdminToolbar';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    api.get<Product[]>('/admin/products?limit=100', { token })
      .then((res) => setProducts(res.data))
      .catch(() => toast.error('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => { if (p.category) map.set(String(p.category.id), p.category.name); });
    return [...map.entries()];
  }, [products]);

  const filtered = useMemo(() => products.filter((p) =>
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (status === 'all' || (status === 'active' ? p.isActive : !p.isActive)) &&
    (category === 'all' || String(p.category?.id) === category),
  ), [products, search, status, category]);

  const { page, setPage, totalPages, total, paged } = usePagination(filtered, 10);

  async function toggleActive(product: Product) {
    const token = adminAuth.getToken();
    if (!token) return;
    const next = !product.isActive;
    setToggling(product.id);
    try {
      await api.put(`/admin/products/${product.id}`, { isActive: next }, { token });
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, isActive: next } : p)));
      toast.success(next ? 'Product is now visible.' : 'Product hidden from storefront.');
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setToggling(null);
    }
  }

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

      <AdminToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search products…">
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          label="Status"
          options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'hidden', label: 'Hidden' }]}
        />
        <FilterSelect
          value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          label="Category"
          options={[{ value: 'all', label: 'All categories' }, ...categories.map(([id, name]) => ({ value: id, label: name }))]}
        />
      </AdminToolbar>

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
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No products found.</td>
              </tr>
            ) : (
              paged.map((product) => (
                <tr key={product.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{product.name}</td>
                  <td className="px-4 py-3 text-text-muted">{product.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{product.variants?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.isActive ? 'success' : 'default'}>
                      {product.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={toggling === product.id}
                        onClick={() => toggleActive(product)}
                        title={product.isActive ? 'Hide from storefront' : 'Show in storefront'}
                      >
                        {product.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="ghost" size="sm"><Pencil size={14} /></Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
    </div>
  );
}
