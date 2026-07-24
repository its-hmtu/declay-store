'use client';

import { useEffect, useState } from 'react';
import { Star, BadgeCheck, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductReview, ReviewSummary } from '@/lib/types';
import { reviewsApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-accent text-accent' : 'text-border-strong'}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const loggedIn = auth.isLoggedIn();

  async function load() {
    try {
      const res = await reviewsApi.list(productId);
      setReviews(res.data);
      const meta = res.meta as unknown as { summary?: ReviewSummary } | undefined;
      setSummary(meta?.summary ?? null);
    } catch {
      // a missing product or transient error — leave the section empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [productId]);

  const avg = summary?.average ?? 0;
  const total = summary?.total ?? reviews.length;

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-text mb-6">Reviews</h2>

      <div className="grid md:grid-cols-[220px_1fr] gap-10">
        {/* Summary + form */}
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-text">{avg.toFixed(1)}</span>
            <div>
              <Stars value={avg} size={16} />
              <p className="text-xs text-text-muted mt-1">{total} review{total !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {loggedIn ? (
            <Button size="sm" variant="secondary" className="mt-6" onClick={() => setFormOpen(true)}>
              <PenLine size={14} /> Write a review
            </Button>
          ) : (
            <p className="mt-6 text-sm text-text-muted">
              <a href="/login" className="text-brand hover:underline">Sign in</a> to write a review.
            </p>
          )}

          <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Write a review">
            <ReviewForm productId={productId} onSubmitted={() => { setFormOpen(false); load(); }} />
          </Modal>
        </div>

        {/* List */}
        <div className="space-y-5">
          {loading ? (
            <p className="text-text-muted text-sm">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-text-muted text-sm">No reviews yet. Be the first to share your thoughts.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="pb-5 border-b border-border last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Stars value={r.rating} />
                  {r.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <BadgeCheck size={13} /> Verified
                    </span>
                  )}
                </div>
                {r.title && <p className="font-medium text-text">{r.title}</p>}
                {r.body && <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{r.body}</p>}
                <p className="text-xs text-text-faint mt-1.5">
                  {r.user?.fullName || r.user?.username || 'Anonymous'} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: number; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [hover,  setHover]  = useState(0);
  const [title,  setTitle]  = useState('');
  const [body,   setBody]   = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = auth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      await reviewsApi.create(token, productId, {
        rating,
        title: title || undefined,
        body: body || undefined,
      });
      toast.success('Thanks for your review!');
      setTitle(''); setBody(''); setRating(5);
      onSubmitted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not submit review.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-medium text-text">Your rating</p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star size={22} className={n <= (hover || rating) ? 'fill-accent text-accent' : 'text-border-strong'} />
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={inputCls} maxLength={200} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience…" rows={3} className={`${inputCls} resize-y`} maxLength={5000} />
      <Button type="submit" size="sm" loading={loading}>Submit review</Button>
    </form>
  );
}
