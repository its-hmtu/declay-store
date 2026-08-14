'use client';

/**
 * M-48: told the admin their session ended, instead of silently redirecting.
 *
 * Before this, a dead refresh token meant the next click bounced to the login
 * screen with no explanation — indistinguishable from a bug, and any half-typed
 * form was gone without a word.
 *
 * Not dismissable: every subsequent request will fail too, so offering "carry on"
 * would only produce a page that quietly stops working.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import Button from '@/components/ui/Button';
import { adminAuth } from '@/lib/auth';
import { onAdminSessionExpired } from '@/lib/session-expiry';

export default function SessionExpiredDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => onAdminSessionExpired(() => setOpen(true)), []);

  function signInAgain() {
    adminAuth.clearToken();
    router.replace('/admin/login');
  }

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissable={false}
      title="Your session has expired"
      size="sm"
      footer={<Button size="sm" onClick={signInAgain}>Sign in again</Button>}
    >
      <p className="text-sm text-text">
        You have been signed out because your session expired. Sign in again to continue.
      </p>
      <p className="mt-2 text-xs text-text-muted">
        Anything you were editing has not been saved.
      </p>
    </Modal>
  );
}
