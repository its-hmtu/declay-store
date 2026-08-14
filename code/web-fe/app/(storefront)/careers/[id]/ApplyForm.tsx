'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api, uploadCv } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function ApplyForm({ jobId }: { jobId: number }) {
  const [form,      setForm]      = useState({ applicantName: '', email: '', cvUrl: '', coverLetter: '' });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleCvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    try {
      const url = await uploadCv(file);
      setForm((f) => ({ ...f, cvUrl: url }));
      toast.success('CV uploaded.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'CV upload failed.');
    } finally {
      setUploadingCv(false);
    }
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
        <label className="block text-sm font-medium text-text mb-1.5">CV / Resume (PDF or Word)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleCvFile} disabled={uploadingCv}
          className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand file:text-white file:text-sm hover:file:bg-brand-light cursor-pointer"
        />
        {uploadingCv && <p className="mt-1 text-xs text-text-muted">Uploading…</p>}
        {form.cvUrl && !uploadingCv && (
          <p className="mt-1.5 text-xs text-success">Uploaded — <a href={form.cvUrl} target="_blank" rel="noreferrer" className="underline">view file</a></p>
        )}
        <input
          id="cvUrl" name="cvUrl" type="url"
          value={form.cvUrl} onChange={handleChange}
          className="mt-2 w-full px-4 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint"
          placeholder="…or paste a link (Google Drive, etc.)"
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
