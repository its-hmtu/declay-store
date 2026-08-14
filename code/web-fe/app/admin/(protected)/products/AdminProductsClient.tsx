'use client';

/**
 * M-48: the reference implementation of an admin list.
 *
 * Every other list screen should follow this shape — `FilterBar` for the labelled
 * query panel (nothing runs until Apply), `DataTable` for sortable columns and the
 * created/updated pair, `ConfirmDialog` before anything destructive. Keeping the
 * pattern in one place is what stops nineteen screens from each inventing their
 * own sort order.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { adminProductsApi, api } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { timestampColumns, type Column } from '@/components/admin/DataTable';
import FilterBar from '@/components/admin/FilterBar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';
import { applyTableState, type DateRange, type SortState } from '@/lib/admin-table';
import { formatPrice } from '@/lib/utils';

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [dateField, setDateField] = useState('createdAt');
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' });

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await api.get<Product[]>('/admin/products?limit=100', { token });
      setProducts(res.data);
    } catch {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const byStatus = products.filter(
      (p) => status === 'all' || (status === 'active' ? p.isActive : !p.isActive),
    );
    return applyTableState(byStatus, {
      search,
      searchFields: ['name', 'slug', 'category.name'],
      dateField,
      dateRange,
      sort,
    });
  }, [products, status, search, dateField, dateRange, sort]);

  const { page, setPage, totalPages, total, paged } = usePagination(rows, 10);

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

  async function confirmDelete() {
    const token = adminAuth.getToken();
    if (!token || !deleting) return;
    try {
      await adminProductsApi.remove(token, deleting.id);
      setProducts((list) => list.filter((p) => p.id !== deleting.id));
      toast.success('Product deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (p) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {p.variants?.[0]?.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.variants[0].images[0]} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-9 w-9 shrink-0 rounded bg-surface-alt" />
          )}
          <Link href={`/admin/products/${p.id}`} className="truncate font-medium text-text hover:text-brand">
            {p.name}
          </Link>
        </div>
      ),
    },
    {
      key: 'category.name',
      header: 'Category',
      sortable: true,
      className: 'text-text-muted',
      render: (p) => p.category?.name ?? '—',
    },
    {
      key: 'variants',
      header: 'Price',
      className: 'text-text whitespace-nowrap',
      // Base price only. The per-variant prices live in the expanded rows, so a
      // "+2" suffix here would just be a worse version of the same information.
      render: (p) => {
        const variant = p.variants?.[0];
        return variant ? formatPrice(parseFloat(variant.price)) : '—';
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'text-text-muted',
      render: (p) => (p.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (p) => (
        <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Published' : 'Hidden'}</Badge>
      ),
    },
    ...timestampColumns<Product>(),
  ];

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <Link href="/admin/products/new">
            <Button size="sm"><Plus size={15} /> New product</Button>
          </Link>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, slug or category…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateField={dateField}
        onDateFieldChange={setDateField}
        dateFieldOptions={[
          { value: 'createdAt', label: 'Created date' },
          { value: 'updatedAt', label: 'Updated date' },
        ]}
        fields={[{
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Published' },
            { value: 'inactive', label: 'Hidden' },
          ],
        }]}
        values={{ status }}
        onValuesChange={(v) => setStatus(v.status)}
        onApplied={() => setPage(1)}
      />

      <DataTable
        columns={columns}
        rows={paged}
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={setSort}
        loading={loading}
        emptyMessage="No products match these filters."
        // M-48b: a product with a single Standard variant has nothing extra to
        // show — the parent row already carries its price and stock.
        isExpandable={(product) => (product.variants?.length ?? 0) > 1}
        expandedRows={(product) =>
          (product.variants ?? []).map((variant) => (
            <tr key={`v-${variant.id}`} className="border-b border-border bg-surface-alt/40 last:border-0">
              <td className="px-2 py-2" />
              <td className="py-2 pl-10 pr-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  {variant.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={variant.images[0]} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-7 w-7 shrink-0 rounded bg-surface" />
                  )}
                  <span className="truncate text-text-muted">{variant.name}</span>
                </div>
              </td>
              {/* Category is a product-level field — a variant has none, so this
                  cell stays empty rather than repeating the parent's value. */}
              <td className="px-4 py-2" />
              <td className="whitespace-nowrap px-4 py-2 text-text-muted">
                {formatPrice(parseFloat(variant.price))}
                {variant.specialPrice && (
                  <span className="ml-1.5 text-xs text-success">
                    → {formatPrice(parseFloat(variant.specialPrice))}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-text-muted">{variant.stock}</td>
              <td className="px-4 py-2">
                {!variant.isActive && <span className="text-xs text-text-muted">Hidden</span>}
              </td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2" />
              <td className="px-4 py-2" />
            </tr>
          ))
        }
      />

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      )}

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete this product?"
        message={<>Delete <strong>{deleting?.name}</strong> and all of its variants?</>}
        warning="Past orders keep their own copy of the name and price, so order history is unaffected."
      />
    </>
  );
}
