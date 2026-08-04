'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser, AdminRole } from '@/lib/types';
import { adminUsersApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AdminToolbar, { FilterSelect } from '@/components/admin/AdminToolbar';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/admin/Pagination';
import { usePagination } from '@/lib/usePagination';

const ROLES: AdminRole[] = ['super_admin', 'admin', 'editor'];
const ROLE_VARIANT: Record<AdminRole, 'info' | 'success' | 'default'> = {
  super_admin: 'info', admin: 'success', editor: 'default',
};

export default function AdminUsersClient() {
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [denied,   setDenied]   = useState(false);
  const [editing,  setEditing]  = useState<AdminUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('all');

  async function load() {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminUsersApi.list(token);
      setUsers(res.data);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 403) setDenied(true);
      else toast.error('Failed to load admins.');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm('Delete this admin user?')) return;
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      await adminUsersApi.remove(token, id);
      toast.success('Admin deleted.');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) return (
    <div>
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-4">
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
  if (denied)  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-3">Admin Users</h1>
      <p className="text-text-muted">Only a <strong>super admin</strong> can manage admin users.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Admin Users</h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> New Admin
        </Button>
      </div>

      {showForm && (
        <AdminUserForm
          admin={editing ?? undefined}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No admins yet.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{u.email}</td>
                  <td className="px-4 py-3 text-text-muted">{u.fullName || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={ROLE_VARIANT[u.role]}>{u.role.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setShowForm(true); }}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(u.id)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUserForm({ admin, onSaved, onCancel }: { admin?: AdminUser; onSaved: () => void; onCancel: () => void }) {
  const isEdit = !!admin;
  const [form, setForm] = useState({
    email:    admin?.email ?? '',
    password: '',
    fullName: admin?.fullName ?? '',
    role:     admin?.role ?? 'editor' as AdminRole,
    isActive: admin?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = { fullName: form.fullName || null, role: form.role, isActive: form.isActive };
        if (form.password) body.password = form.password;
        await adminUsersApi.update(token, admin.id, body);
      } else {
        await adminUsersApi.create(token, {
          email: form.email,
          password: form.password,
          fullName: form.fullName || null,
          role: form.role,
          isActive: form.isActive,
        });
      }
      toast.success(isEdit ? 'Admin updated.' : 'Admin created.');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text text-sm';

  return (
    <form onSubmit={save} className="mb-6 p-5 rounded-xl border border-brand-lighter bg-brand-faint space-y-4">
      <h3 className="font-medium text-text">{isEdit ? `Edit ${admin.email}` : 'New Admin User'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Email *</label>
          <input type="email" required disabled={isEdit} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={`${inputCls} disabled:opacity-60`} placeholder="admin@declay.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">{isEdit ? 'New password (optional)' : 'Password *'}</label>
          <input type="password" required={!isEdit} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Min 8 chars, 1 upper, 1 number" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Full name</label>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputCls} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text mb-1">Role</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))} className={inputCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-brand" />
        <span className="text-sm text-text">Active</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={loading}>{isEdit ? 'Save' : 'Create'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
