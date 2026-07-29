'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, MapPin, KeyRound, Plus, Pencil, Trash2, Star, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { User, Address, AddressType } from '@/lib/types';
import { userApi, addressApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import VietnamAddressSelect, { type VietnamAddressValue } from '@/components/storefront/VietnamAddressSelect';

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';
const labelCls = 'block text-xs font-medium text-text mb-1';

export default function AccountClient() {
  const { t } = useT();
  const router = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { router.push('/login?next=/account'); return; }
    userApi.getInfo(token)
      .then((res) => setUser(res.data))
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-text-muted">Loading…</div>;
  if (!user)   return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-text-muted">{t('account.loadFailed')}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-text">{t('account.myProfile')}</h1>
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <Package size={15} /> My orders
        </Link>
      </div>

      <ProfileSection user={user} onUpdated={setUser} />
      {user.authProvider === 'local' && <PasswordSection />}
      <AddressSection />
    </div>
  );
}

/* ── Profile info ──────────────────────────────────────── */
function ProfileSection({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const { t } = useT();
  const [form, setForm] = useState({
    fullName:    user.fullName ?? '',
    username:    user.username ?? '',
    phoneNumber: user.phoneNumber ?? '',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = auth.getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await userApi.updateInfo(token, {
        fullName:    form.fullName || null,
        username:    form.username || undefined,
        phoneNumber: form.phoneNumber || null,
        dateOfBirth: form.dateOfBirth || null,
      });
      onUpdated(res.data);
      toast.success('Profile updated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2 mb-5">
        <UserIcon size={18} /> Account details
      </h2>
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('account.email')}</label>
            <input value={user.email} disabled className={`${inputCls} opacity-60`} />
            <p className="mt-1 text-xs text-text-faint">{user.isEmailVerified ? '✓ Verified' : 'Not verified'}</p>
          </div>
          <div>
            <label className={labelCls}>{t('account.fullName')}</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputCls} placeholder="Alice Nguyen" />
          </div>
          <div>
            <label className={labelCls}>{t('account.username')}</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className={inputCls} placeholder="alice" />
          </div>
          <div>
            <label className={labelCls}>{t('account.phone')}</label>
            <input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} className={inputCls} placeholder="0901234567" />
          </div>
          <div>
            <label className={labelCls}>{t('account.dob')}</label>
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>{t('account.save')}</Button>
      </form>
    </section>
  );
}

/* ── Change password ───────────────────────────────────── */
function PasswordSection() {
  const { t } = useT();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = auth.getToken();
    if (!token) return;
    if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await userApi.changePassword(token, form);
      toast.success('Password changed.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2 mb-5">
        <KeyRound size={18} /> Change password
      </h2>
      <form onSubmit={save} className="space-y-4 max-w-md">
        <div>
          <label className={labelCls}>{t('account.currentPassword')}</label>
          <input type="password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('account.newPassword')}</label>
            <input type="password" required value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} className={inputCls} placeholder={t('account.passwordHint')} />
          </div>
          <div>
            <label className={labelCls}>{t('account.confirmPassword')}</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>{t('account.updatePassword')}</Button>
      </form>
    </section>
  );
}

/* ── Addresses ─────────────────────────────────────────── */
function AddressSection() {
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
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2">
          <MapPin size={18} /> Addresses
        </h2>
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
    // M-13: mã địa giới GHN — thứ thực sự dùng để tính phí.
    ghnProvinceId: address?.ghnProvinceId ?? null,
    ghnDistrictId: address?.ghnDistrictId ?? null,
    ghnWardCode:   address?.ghnWardCode ?? null,
    country:       address?.country ?? 'Vietnam',
    postalCode:    address?.postalCode ?? '',
    addressType:   (address?.addressType ?? 'home') as AddressType,
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
      if (isEdit) await addressApi.update(token, address.id, body);
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
          <label className={labelCls}>Receiver name *</label>
          <input required value={form.receiverName} onChange={(e) => set('receiverName', e.target.value)} className={inputCls} placeholder="Alice Nguyen" />
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <input required value={form.receiverPhone} onChange={(e) => set('receiverPhone', e.target.value)} className={inputCls} placeholder="0901234567" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address line *</label>
          <input required value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} className={inputCls} placeholder="12 Nguyen Hue" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t('address.line2')}</label>
          <input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className={inputCls} placeholder={t('address.line2Hint')} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t('address.province')} / {t('address.district')} / {t('address.ward')} *</label>
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
              // Lưu tên hiển thị để in vận đơn và hiện trong sổ địa chỉ.
              city: next.provinceName,
              district: next.districtName,
              ward: next.wardName,
            }))}
          />
        </div>
        <div>
          <label className={labelCls}>{t('address.postalCode')}</label>
          <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} className={inputCls} placeholder="700000" />
        </div>
        <div>
          <label className={labelCls}>{t('address.type')}</label>
          <select value={form.addressType} onChange={(e) => set('addressType', e.target.value as AddressType)} className={inputCls}>
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
