'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { toast } from 'sonner';
import type { User } from '@/lib/types';
import { userApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

export default function ProfileSection({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const { t } = useT();
  const [form, setForm] = useState({
    fullName:    user.fullName ?? '',
    username:    user.username ?? '',
    phoneNumber: user.phoneNumber ?? '',
  });
  const [dateOfBirthDate, setDateOfBirthDate] = useState<Date | null>(user.dateOfBirth ? new Date(user.dateOfBirth) : null);
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
        dateOfBirth: dateOfBirthDate ? dateOfBirthDate.toISOString().slice(0, 10) : null,
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
    <section className="">
      <h2 className="font-serif text-xl font-semibold text-text flex items-center gap-2 mb-5">Account details</h2>
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('account.email')}</Label>
            <Input value={user.email} disabled className="opacity-60" />
            <p className="mt-1 text-xs text-text-faint">{user.isEmailVerified ? '✓ Verified' : 'Not verified'}</p>
          </div>
          <div>
            <Label>{t('account.fullName')}</Label>
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Alice Nguyen" />
          </div>
          <div>
            <Label>{t('account.username')}</Label>
            <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="alice" />
          </div>
          <div>
            <Label>{t('account.phone')}</Label>
            <Input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} placeholder="0901234567" />
          </div>
          <div>
            <Label>{t('account.dob')}</Label>
            <DatePicker value={dateOfBirthDate} onChange={setDateOfBirthDate} placeholder="Select date" />
          </div>
        </div>
        <Button type="submit" size="sm" loading={saving}>{t('account.save')}</Button>
      </form>
    </section>
  );
}
