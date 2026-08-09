'use client';

/**
 * M-48: the shell every create/edit screen sits in.
 *
 * Create and edit used to be inline panels that pushed the list down the page;
 * they are now their own routes. That is what makes a URL like
 * `/admin/products/12` shareable, the browser's back button meaningful, and the
 * breadcrumb accurate.
 *
 * The action bar is sticky at the bottom: on a tall form (products has three
 * tabs) Save would otherwise sit below the fold, and an admin who cannot see the
 * button assumes the page is broken.
 *
 * While saving, BOTH buttons are disabled — Cancel too. Navigating away mid-flight
 * leaves the admin unsure whether the record was written.
 */

import Button from '@/components/ui/Button';
import PageHeader from './PageHeader';

export default function FormPage({
  title,
  description,
  onSubmit,
  onCancel,
  saving = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  /** Disable Save on validation grounds; the reason belongs next to the field. */
  saveDisabled = false,
  headerActions,
  children,
}: {
  title: string;
  description?: string;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // a double-press must not fire two writes
    await onSubmit();
  }

  return (
    <form onSubmit={submit} className="pb-24">
      <PageHeader title={title} description={description} actions={headerActions} />

      <div className="space-y-5">{children}</div>

      <div className="fixed bottom-0 left-56 right-0 z-20 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur md:px-8">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
