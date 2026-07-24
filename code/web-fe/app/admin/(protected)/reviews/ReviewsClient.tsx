'use client';

import { useEffect, useState } from 'react';
import { Star, Trash2, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductReview } from '@/lib/types';
import { adminReviewsApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-6">Reviews</h1>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-text-muted">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
