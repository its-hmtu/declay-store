'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function ApplyForm({ jobId }: { jobId: number }) {
  const [form,      setForm]      = useState({ applicantName: '', email: '', cvUrl: '', coverLetter: '' });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/applications`, form);
      setSubmitted(true);
      toast.success('Application submitted! We\'ll be in touch.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-6 rounded-xl bg-success/10 border border-success/20 text-success text-center">
        <p className="font-medium text-lg">Application received!</p>
        <p className="text-sm mt-1">Thank you for applying. We&apos;ll review your application and be in touch soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5" htmlFor="applicantName">Full Name *</label>
          <input
            id="applicantName" name="applicantName" required
            value={form.applicantName} onChange={handleChange}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5" htmlFor="email">Email *</label>
          <input
            id="email" name="email" type="email" required
            value={form.email} onChange={handleChange}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
            placeholder="jane@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="cvUrl">CV / Resume URL</label>
        <input
          id="cvUrl" name="cvUrl" type="url"
          value={form.cvUrl} onChange={handleChange}
          className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
          placeholder="https://drive.google.com/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5" htmlFor="coverLetter">Cover Letter</label>
        <textarea
          id="coverLetter" name="coverLetter" rows={6}
          value={form.coverLetter} onChange={handleChange}
          className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint resize-none"
          placeholder="Tell us about yourself and why you'd love to join Declay…"
        />
      </div>

      <Button type="submit" loading={loading}>Submit Application</Button>
    </form>
  );
}
