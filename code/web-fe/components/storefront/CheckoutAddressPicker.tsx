'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, MapPin } from 'lucide-react';
import type { Address } from '@/lib/types';
import { addressApi } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Button from '@/components/ui/Button';
import VietnamAddressSelect, { emptyVietnamAddress, type VietnamAddressValue } from '@/components/storefront/VietnamAddressSelect';

/**
 * M-34: modal chọn địa chỉ giao hàng ở Checkout — liệt kê địa chỉ đã lưu để chọn,
 * và cho THÊM địa chỉ mới ngay tại đây (không phải rời trang sang /account).
 */
export default function CheckoutAddressPicker({
  open, onOpenChange, addresses, selectedId, token, onSelect, onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  addresses: Address[];
  selectedId: number | null;
  token: string;
  onSelect: (id: number) => void;
  onAdded: (addr: Address) => void;
}) {
  const { t } = useT();
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ receiverName: '', receiverPhone: '', addressLine: '', addressLine2: '' });
  const [geo, setGeo] = useState<VietnamAddressValue>(emptyVietnamAddress);

  function resetForm() {
    setForm({ receiverName: '', receiverPhone: '', addressLine: '', addressLine2: '' });
    setGeo(emptyVietnamAddress);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.receiverName.trim() || !form.receiverPhone.trim() || !form.addressLine.trim()) {
      return toast.error('Nhập đủ tên, số điện thoại và địa chỉ.');
    }
    if (!geo.districtId || !geo.wardCode) return toast.error('Chọn Tỉnh/Quận/Phường.');
    setSaving(true);
    try {
      const { data } = await addressApi.create(token, {
        receiverName: form.receiverName,
        receiverPhone: form.receiverPhone,
        addressLine: form.addressLine,
        addressLine2: form.addressLine2 || null,
        ward: geo.wardName, district: geo.districtName, city: geo.provinceName,
        ghnProvinceId: geo.provinceId, ghnDistrictId: geo.districtId, ghnWardCode: geo.wardCode,
        country: 'Vietnam', addressType: 'home', isDefault: addresses.length === 0,
      });
      onAdded(data);
      onSelect(data.id);
      resetForm();
      setMode('list');
      onOpenChange(false);
      toast.success('Đã thêm địa chỉ.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được địa chỉ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setMode('list'); }}>
      <DialogContent className="max-w-lg">
        <h2 className="font-serif text-xl font-bold text-text mb-4">
          {mode === 'list' ? t('checkout.chooseAddress') : t('checkout.newAddress')}
        </h2>

        {mode === 'list' ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => { onSelect(addr.id); onOpenChange(false); }}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selectedId === addr.id ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'
                }`}
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="text-sm">
                  <p className="font-medium text-text">{addr.receiverName} <span className="font-normal text-text-faint">· {addr.receiverPhone}</span></p>
                  <p className="text-text-muted">{addr.addressLine}, {addr.ward}, {addr.district}, {addr.city}</p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMode('add')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm font-medium text-brand hover:border-brand-lighter"
            >
              <Plus size={16} /> {t('checkout.addAddress')}
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t('address.receiver')} *</Label>
                <Input value={form.receiverName} onChange={(e) => setForm((f) => ({ ...f, receiverName: e.target.value }))} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <Label>{t('address.phone')} *</Label>
                <Input value={form.receiverPhone} onChange={(e) => setForm((f) => ({ ...f, receiverPhone: e.target.value }))} placeholder="0901234567" />
              </div>
            </div>
            <div>
              <Label>{t('address.line')} *</Label>
              <Input value={form.addressLine} onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))} placeholder="12 Nguyễn Huệ" />
            </div>
            <div>
              <Label>{t('address.line2')}</Label>
              <Input value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} placeholder={t('address.line2Hint')} />
            </div>
            <div>
              <Label>{t('address.province')} / {t('address.district')} / {t('address.ward')} *</Label>
              <VietnamAddressSelect value={geo} onChange={setGeo} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" loading={saving}>{t('checkout.saveAddress')}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setMode('list'); resetForm(); }}>{t('common.cancel')}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
