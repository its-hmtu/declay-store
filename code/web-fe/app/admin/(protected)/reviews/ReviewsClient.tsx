'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, Trash2, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductReview } from '@/lib/types';
import { adminReviewsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import FilterBar from '@/components/admin/FilterBar';

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [rating, setRating]   = useState('all');
  const [verified, setVerified] = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reviews.filter((r) =>
      (rating === 'all' || r.rating === Number(rating)) &&
      (verified === 'all' || (verified === 'yes' ? r.isVerifiedPurchase : !r.isVerifiedPurchase)) &&
      (term === ''
        || (r.title ?? '').toLowerCase().includes(term)
        || (r.body ?? '').toLowerCase().includes(term)
        || (r.product?.name ?? '').toLowerCase().includes(term)),
    );
  }, [reviews, search, rating, verified]);

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminReviewsApi.list(token, { limit: 100 });
      setReviews(res.data);
    } catch { toast.error('Failed to load reviews.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminReviewsApi.remove(token, id);
      toast.success('Review deleted.');
      setReviews((r) => r.filter((x) => x.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <Card className="p-8 py-8 text-center">
        <Skeleton className="h-4 w-64 mx-auto mb-2" />
        <Skeleton className="h-3 w-40 mx-auto" />
      </Card>
    </div>
  );

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-6">Reviews</h1>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, body or product…"
        fields={[
          {
            key: 'rating',
            label: 'Rating',
            type: 'select',
            options: [
              { value: 'all', label: 'All ratings' },
              ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` })),
            ],
          },
          {
            key: 'verified',
            label: 'Purchase',
            type: 'select',
            options: [
              { value: 'all', label: 'All reviews' },
              { value: 'yes', label: 'Verified only' },
              { value: 'no', label: 'Unverified only' },
            ],
          },
        ]}
        values={{ rating, verified }}
        onValuesChange={(v) => { setRating(v.rating); setVerified(v.verified); }}
      />

      {filtered.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-text-muted">
            {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match these filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="flex-row items-start gap-4 p-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} className={n <= r.rating ? 'fill-accent text-accent' : 'text-border-strong'} />
                    ))}
                  </span>
                  {r.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck size={13} /> Verified</span>
                  )}
                </div>
                {r.title && <p className="font-medium text-text">{r.title}</p>}
                {r.body && <p className="text-sm text-text-muted mt-0.5">{r.body}</p>}
                <p className="text-xs text-text-faint mt-1.5">
                  {r.product?.name ?? `Product #${r.productId}`} · {r.user?.fullName || r.user?.username || 'Anonymous'} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
