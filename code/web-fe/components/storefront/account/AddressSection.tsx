'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { addressApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import type { Address } from '@/lib/types';
import VietnamAddressSelect, { type VietnamAddressValue } from '@/components/storefront/VietnamAddressSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AddressSection() {
  const { t } = useT();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Address | null>(null);
  const [showForm,  setShowForm]  = useState(false);

  async function load() {
    const token = auth.getToken();
    if (!token) return;
    try {
      const res = await addressApi.list(token);
      setAddresses(res.data);
    } catch { toast.error('Failed to load addresses.'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this address?')) return;
    const token = auth.getToken();
    if (!token) return;
    try {
      await addressApi.remove(token, id);
      toast.success('Address deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function setDefault(addr: Address) {
    const token = auth.getToken();
    if (!token || addr.isDefault) return;
    try {
      await addressApi.update(token, addr.id, { isDefault: true });
      toast.success('Default address updated.');
      load();
    } catch {
      toast.error('Could not set default.');
    }
  }

  return (
    <section className="">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2"><MapPin size={18} /> Addresses</h2>
        {!showForm && (
          <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add address
          </Button>
        )}
      </div>

      {showForm && (
        <AddressForm
          address={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : addresses.length === 0 ? (
        !showForm && <p className="text-sm text-text-muted">{t('address.none')}</p>
      ) : (
        <div className="space-y-3 mt-4">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
              <div className="text-sm min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-text">{a.receiverName}</span>
                  <Badge variant="default">{a.addressType}</Badge>
                  {a.isDefault && <Badge variant="success">{t('address.default')}</Badge>}
                </div>
                <p className="text-text-muted">{a.receiverPhone}</p>
                <p className="text-text-muted">{a.addressLine}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.ward}, {a.district}</p>
                <p className="text-text-muted">{a.city}, {a.country}{a.postalCode ? ` ${a.postalCode}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.isDefault && (
                  <button onClick={() => setDefault(a)} className="p-1.5 text-text-faint hover:text-accent transition-colors" title={t('address.setDefault')}><Star size={15} /></button>
                )}
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 text-text-faint hover:text-brand transition-colors" title={t('common.edit')}><Pencil size={15} /></button>
                <button onClick={() => remove(a.id)} className="p-1.5 text-text-faint hover:text-error transition-colors" title={t('common.delete')}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddressForm({ address, onSaved, onCancel }: { address?: Address; onSaved: () => void; onCancel: () => void }) {
  const { t } = useT();
  const isEdit = !!address;
  const [form, setForm] = useState({
    receiverName:  address?.receiverName ?? '',
    receiverPhone: address?.receiverPhone ?? '',
    addressLine:   address?.addressLine ?? '',
    addressLine2:  address?.addressLine2 ?? '',
    ward:          address?.ward ?? '',
    district:      address?.district ?? '',
    city:          address?.city ?? '',
    ghnProvinceId: address?.ghnProvinceId ?? null,
    ghnDistrictId: address?.ghnDistrictId ?? null,
    ghnWardCode:   address?.ghnWardCode ?? null,
    country:       address?.country ?? 'Vietnam',
    postalCode:    address?.postalCode ?? '',
    addressType:   (address?.addressType ?? 'home') as any,
    isDefault:     address?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = auth.getToken();
    if (!token) return;
    setSaving(true);
    const body = {
      ...form,
      addressLine2: form.addressLine2 || null,
      postalCode:   form.postalCode || null,
    };
    try {
      if (isEdit) await addressApi.update(token, address!.id, body);
      else        await addressApi.create(token, body);
      toast.success(isEdit ? 'Address updated.' : 'Address added.');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <form onSubmit={save} className="mb-4 p-5 rounded-xl border border-brand-lighter bg-brand-faint space-y-4">
      <h3 className="font-medium text-text">{isEdit ? 'Edit address' : 'New address'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Receiver name *</Label>
          <Input required value={form.receiverName} onChange={(e) => set('receiverName', e.target.value)} placeholder="Alice Nguyen" />
        </div>
        <div>
          <Label>Phone *</Label>
          <Input required value={form.receiverPhone} onChange={(e) => set('receiverPhone', e.target.value)} placeholder="0901234567" />
        </div>
        <div className="sm:col-span-2">
          <Label>Address line *</Label>
          <Input required value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} placeholder="12 Nguyen Hue" />
        </div>
        <div className="sm:col-span-2">
          <Label>{t('address.line2')}</Label>
          <Input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} placeholder={t('address.line2Hint')} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t('address.province')} / {t('address.district')} / {t('address.ward')} *</Label>
          <VietnamAddressSelect
            value={{
              provinceId: form.ghnProvinceId,
              districtId: form.ghnDistrictId,
              wardCode: form.ghnWardCode,
              provinceName: form.city,
              districtName: form.district,
              wardName: form.ward,
            }}
            onChange={(next: VietnamAddressValue) => setForm((f) => ({
              ...f,
              ghnProvinceId: next.provinceId,
              ghnDistrictId: next.districtId,
              ghnWardCode: next.wardCode,
              city: next.provinceName,
              district: next.districtName,
              ward: next.wardName,
            }))}
          />
        </div>
        <div>
          <Label>{t('address.postalCode')}</Label>
          <Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} placeholder="700000" />
        </div>
        <div>
          <Label>{t('address.type')}</Label>
          <select value={form.addressType} onChange={(e) => set('addressType', e.target.value as any)} className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            <option value="home">{t('address.home')}</option>
            <option value="work">{t('address.work')}</option>
            <option value="other">{t('address.other')}</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">{t('address.setDefault')}</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>{isEdit ? 'Save' : 'Add address'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}
