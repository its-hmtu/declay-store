'use client';

/**
 * M-48: confirmation before a destructive action.
 *
 * Replaces `window.confirm`, which the admin pages used for every delete. The
 * native dialog cannot say WHAT is about to be deleted, cannot warn about knock-on
 * effects (deleting a job takes its applications with it), and gives no feedback
 * while the request runs — so an admin who clicks twice fires two deletes.
 *
 * The confirm button owns the async work and stays disabled until it settles.
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from '@/components/ui/Button';

export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  /** Name the specific record — "Delete this?" tells the admin nothing. */
  message,
  /** Consequences that are not obvious, e.g. cascading deletes. */
  warning,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: React.ReactNode;
  warning?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      // The caller closes on success; on failure the dialog stays open with the
      // button live again so the admin can retry or cancel.
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      // Closing mid-delete would leave the admin unsure whether it happened.
      dismissable={!busy}
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={destructive ? 'danger' : 'primary'}
            onClick={confirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {destructive && (
          <span className="mt-0.5 shrink-0 text-error">
            <AlertTriangle size={18} />
          </span>
        )}
        <div className="min-w-0 text-sm text-text">
          <div>{message}</div>
          {warning && <p className="mt-2 text-xs text-text-muted">{warning}</p>}
        </div>
      </div>
    </Modal>
  );
}
