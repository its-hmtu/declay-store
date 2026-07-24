'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, MapPin, KeyRound, Plus, Pencil, Trash2, Star, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { User, Address, AddressType } from '@/lib/types';
import { userApi, addressApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';
const labelCls = 'block text-xs font-medium text-text mb-1';

export default function AccountClient() {
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
  if (!user)   return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-text-muted">Could not load profile.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-text">My Profile</h1>
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
            <label className={labelCls}>Email</label>
            <input value={user.email} disabled className={`${inputCls} opacity-60`} />
            <p className="mt-1 text-xs text-text-faint">{user.isEmailVerified ? '✓ Verified' : 'Not verified'}</p>
          </div>
          <div>
            <label className={labelCls}>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputCls} placeholder="Alice Nguyen" />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className={inputCls} placeholder="alice" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} className={inputCls} placeholder="0901234567" />
          </div>
          <div>
            <label className={labelCls}>Date of birth</label>
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>Save changes</Button>
      </form>
    </section>
  );
}

/* ── Change password ───────────────────────────────────── */
function PasswordSection() {
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
          <label className={labelCls}>Current password</label>
          <input type="password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>New password</label>
            <input type="password" required value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} className={inputCls} placeholder="Min 8, 1 upper, 1 number" />
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>Update password</Button>
      </form>
    </section>
  );
}

/* ── Addresses ─────────────────────────────────────────── */
function AddressSection() {
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
        !showForm && <p className="text-sm text-text-muted">No addresses yet.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
              <div className="text-sm min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-text">{a.receiverName}</span>
                  <Badge variant="default">{a.addressType}</Badge>
                  {a.isDefault && <Badge variant="success">Default</Badge>}
                </div>
                <p className="text-text-muted">{a.receiverPhone}</p>
                <p className="text-text-muted">{a.addressLine}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.ward}, {a.district}</p>
                <p className="text-text-muted">{a.city}, {a.country}{a.postalCode ? ` ${a.postalCode}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.isDefault && (
                  <button onClick={() => setDefault(a)} className="p-1.5 text-text-faint hover:text-accent transition-colors" title="Set as default"><Star size={15} /></button>
                )}
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 text-text-faint hover:text-brand transition-colors" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(a.id)} className="p-1.5 text-text-faint hover:text-error transition-colors" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddressForm({ address, onSaved, onCancel }: { address?: Address; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!address;
  const [form, setForm] = useState({
    receiverName:  address?.receiverName ?? '',
    receiverPhone: address?.receiverPhone ?? '',
    addressLine:   address?.addressLine ?? '',
    addressLine2:  address?.addressLine2 ?? '',
    ward:          address?.ward ?? '',
    district:      address?.district ?? '',
    city:          address?.city ?? '',
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
          <label className={labelCls}>Address line 2</label>
          <input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className={inputCls} placeholder="Apartment, suite, etc. (optional)" />
        </div>
        <div>
          <label className={labelCls}>Ward *</label>
          <input required value={form.ward} onChange={(e) => set('ward', e.target.value)} className={inputCls} placeholder="Ben Nghe" />
        </div>
        <div>
          <label className={labelCls}>District *</label>
          <input required value={form.district} onChange={(e) => set('district', e.target.value)} className={inputCls} placeholder="District 1" />
        </div>
        <div>
          <label className={labelCls}>City *</label>
          <input required value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} placeholder="Ho Chi Minh City" />
        </div>
        <div>
          <label className={labelCls}>Country *</label>
          <input required value={form.country} onChange={(e) => set('country', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Postal code</label>
          <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} className={inputCls} placeholder="700000" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={form.addressType} onChange={(e) => set('addressType', e.target.value as AddressType)} className={inputCls}>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">Set as default address</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>{isEdit ? 'Save' : 'Add address'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
