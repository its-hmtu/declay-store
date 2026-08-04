'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { toast } from 'sonner';
import { userApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PasswordSection() {
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
    <section className="">
      <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2 mb-5"><KeyRound size={18} /> Change password</h2>
      <form onSubmit={save} className="space-y-4 max-w-md">
        <div>
          <Label>{t('account.currentPassword')}</Label>
          <Input type="password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('account.newPassword')}</Label>
            <Input type="password" required value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} placeholder={t('account.passwordHint')} />
          </div>
          <div>
            <Label>{t('account.confirmPassword')}</Label>
            <Input type="password" required value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>{t('account.updatePassword')}</Button>
      </form>
    </section>
  );
}
