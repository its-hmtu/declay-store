'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';
import type { Order } from '@/lib/types';
import { ordersApi, uploadReturnPhoto } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';

interface LineState {
  selected: boolean;
  quantity: number;
  reason: string;
  photoUrls: string[];
  uploading: boolean;
}

/**
 * M-29e: form yêu cầu trả hàng lỗi/sai.
 *
 * Chỉ nhận hàng lỗi nên MỖI món trả bắt buộc có ảnh + lý do (khớp BR-R2 phía
 * server). Trả theo từng món: khách chọn món, số lượng, đính ảnh.
 */
export default function ReturnForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const [lines, setLines] = useState<Record<number, LineState>>({});
  const [submitting, setSubmitting] = useState(false);

  function line(id: number, max: number): LineState {
    return lines[id] ?? { selected: false, quantity: 1, reason: '', photoUrls: [], uploading: false };
  }
  function update(id: number, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [id]: { ...line(id, 1), ...patch } }));
  }

  async function onUpload(id: number, file: File | undefined) {
    const token = auth.getToken();
    if (!file || !token) return;
    update(id, { uploading: true });
    try {
      const url = await uploadReturnPhoto(file, token);
      const cur = line(id, 1);
      update(id, { photoUrls: [...cur.photoUrls, url], uploading: false });
    } catch (err: unknown) {
      update(id, { uploading: false });
      toast.error(err instanceof Error ? err.message : 'Tải ảnh thất bại.');
    }
  }

  async function submit() {
    const token = auth.getToken();
    if (!token) return;
    const items = (order.items ?? [])
      .filter((it) => lines[it.id]?.selected)
      .map((it) => {
        const l = lines[it.id];
        return { orderItemId: it.id, quantity: l.quantity, reason: l.reason, photoUrls: l.photoUrls };
      });

    if (items.length === 0) return toast.error('Chọn ít nhất một món để trả.');
    if (items.some((i) => i.photoUrls.length === 0)) return toast.error('Mỗi món trả phải có ít nhất một ảnh.');
    if (items.some((i) => !i.reason.trim())) return toast.error('Nhập lý do cho mỗi món trả.');

    setSubmitting(true);
    try {
      await ordersApi.createReturn(token, order.id, { type: 'defective', items });
      toast.success('Đã gửi yêu cầu trả hàng, chờ cửa hàng duyệt.');
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-serif text-xl font-bold text-text mb-1">Trả hàng lỗi / sai</h2>
      <p className="text-sm text-text-muted mb-4">
        Chỉ nhận hàng lỗi hoặc giao sai, trong vòng 7 ngày kể từ khi nhận. Mỗi món cần ảnh và lý do.
      </p>

      <div className="divide-y divide-border">
        {(order.items ?? []).map((it) => {
          const l = line(it.id, it.quantity);
          return (
            <div key={it.id} className="py-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={l.selected}
                  onChange={(e) => update(it.id, { selected: e.target.checked })}
                />
                <span className="font-medium text-text">{it.productNameAtPurchase}</span>
                <span className="text-sm text-text-muted">{it.variantNameAtPurchase} · đã mua {it.quantity}</span>
              </label>

              {l.selected && (
                <div className="mt-3 pl-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Số lượng trả:</span>
                    <input
                      type="number" min={1} max={it.quantity} value={l.quantity}
                      onChange={(e) => update(it.id, { quantity: Math.max(1, Math.min(it.quantity, Number(e.target.value) || 1)) })}
                      className="w-16 px-2 py-1 border border-border rounded-md bg-surface text-text"
                    />
                  </div>
                  <input
                    type="text" placeholder="Lý do (vd: vỡ, sai mẫu…)" value={l.reason}
                    onChange={(e) => update(it.id, { reason: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text text-sm"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {l.photoUrls.map((url) => (
                      <div key={url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="bằng chứng" className="h-14 w-14 object-cover rounded-md border border-border" />
                        <button
                          type="button"
                          onClick={() => update(it.id, { photoUrls: l.photoUrls.filter((u) => u !== url) })}
                          className="absolute -top-1.5 -right-1.5 bg-error text-white rounded-full p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="h-14 w-14 flex items-center justify-center border border-dashed border-border rounded-md cursor-pointer text-text-muted hover:text-text">
                      {l.uploading ? '…' : <Upload size={16} />}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => onUpload(it.id, e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3">
        <Button size="sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Đang gửi…' : 'Gửi yêu cầu trả'}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone} disabled={submitting}>Huỷ</Button>
      </div>
    </div>
  );
}
