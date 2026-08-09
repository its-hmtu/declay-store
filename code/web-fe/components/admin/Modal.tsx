'use client';

/**
 * M-48: the admin's one modal primitive.
 *
 * Kept deliberately small — it handles the things every dialog gets wrong when
 * hand-rolled: Escape to close, click-outside to close, body scroll lock, and
 * focus landing inside the dialog rather than staying behind it.
 *
 * `dismissable={false}` is for dialogs the user must answer (session expired) and
 * for forms mid-submit, where closing would abandon a request already in flight.
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissable?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) onClose();
    }
    document.addEventListener('keydown', onKey);

    // Without this the page behind scrolls under the dialog on mobile.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${width} max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold text-text">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
          </div>
          {dismissable && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {children && <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>}

        {footer && (
          <div className="flex justify-end gap-2 border-t border-border bg-surface-alt px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
