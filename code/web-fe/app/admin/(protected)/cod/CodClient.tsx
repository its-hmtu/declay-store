'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Banknote } from 'lucide-react';
import type { CodPendingRow } from '@/lib/types';
import { adminCodApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function CodClient() {
  const [rows, setRows] = useState<CodPendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [collected, setCollected] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminCodApi.pending(token);
      setRows(res.data);
      // Pre-fill with the expected amount — the common case is an exact match.
      setCollected(Object.fromEntries(res.data.map((r) => [r.paymentId, String(r.amount)])));
    } catch {
      toast.error('Failed to load COD payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reconcile(row: CodPendingRow) {
    const token = adminAuth.getToken();
    if (!token) return;
    const amount = Number(collected[row.paymentId]);
    if (!Number.isFinite(amount) || amount < 0) { toast.error('Enter the amount collected.'); return; }

    let note: string | undefined;
    if (Math.abs(amount - row.amount) > 0.01) {
      note = prompt(`Amount differs from ${formatPrice(row.amount)}. Add a note explaining the difference:`)?.trim() || undefined;
      if (!note) { toast.error('A note is required when the amount does not match.'); return; }
    }

    setBusyId(row.paymentId);
    try {
      const res = await adminCodApi.reconcile(token, row.paymentId, amount, note);
      const { outcome, difference } = res.data;
      if (outcome === 'matched') toast.success(`Order #${row.orderId} reconciled.`);
      else toast.warning(`Order #${row.orderId} ${outcome} by ${formatPrice(Math.abs(difference))} — recorded.`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reconcile failed.');
    } finally {
      setBusyId(null);
    }
  }

  const totalOutstanding = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">COD reconciliation</h1>
        <p className="text-sm text-text-muted mt-1">
          Delivered cash-on-delivery orders whose money has not been checked off yet.
        </p>
      </div>

      <Card className="p-4 py-4 mb-6 flex items-center gap-3">
        <Banknote size={18} className="text-brand" />
        <span className="text-sm text-text-muted">Outstanding cash</span>
        <span className="ml-auto font-serif text-xl font-bold text-text">{formatPrice(totalOutstanding)}</span>
      </Card>

      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Delivered</th>
              <th className="px-4 py-3 text-right">Expected</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">All cash reconciled.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.paymentId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${r.orderId}`} className="font-medium text-text hover:text-brand">#{r.orderId}</Link>
                  {r.status === 'returned' && <span className="ml-2 text-xs text-warning">returned</span>}
                </td>
                <td className="px-4 py-3 text-text-muted">{r.customer}</td>
                <td className="px-4 py-3 text-text-muted text-xs">
                  {r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right text-text">{formatPrice(r.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <Input
                    aria-label="Amount collected"
                    type="number" step="0.01" min="0"
                    value={collected[r.paymentId] ?? ''}
                    onChange={(e) => setCollected((c) => ({ ...c, [r.paymentId]: e.target.value }))}
                    className="ml-auto h-8 w-28 text-right"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" loading={busyId === r.paymentId} onClick={() => reconcile(r)}>
                    Reconcile
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
