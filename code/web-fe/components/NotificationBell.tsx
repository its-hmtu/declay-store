"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { notificationsApi, adminNotificationsApi } from '@/lib/api';
import { auth, adminAuth } from '@/lib/auth';

const NotificationBell = React.forwardRef<HTMLDivElement, { variant?: 'customer' | 'admin' }>(
  ({ variant = 'customer' }, ref) => {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  // support forwarded ref
  React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

  const api = variant === 'admin' ? adminNotificationsApi : notificationsApi;
  const getToken = variant === 'admin' ? adminAuth.getToken : auth.getToken;

  async function load() {
    const token = getToken();
    if (!token) return;
    try {
      const { data } = await api.list(token);
      setItems(data.rows);
      setUnread(data.unread);
    } catch { /* ignore transient errors */ }
  }

  useEffect(() => {
    load();
    // M-33: admin gần real-time — poll nhanh (15s) + nạp lại ngay khi quay lại tab.
    const id = setInterval(load, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (innerRef.current && !innerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function openItem(n: Notification) {
    const token = getToken();
    if (token && !n.isRead) {
      try { await api.markRead(token, n.id); } catch { /* ignore */ }
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    const token = getToken();
    if (!token) return;
    try { await api.markAllRead(token); } catch { /* ignore */ }
    setUnread(0);
    setItems((list) => list.map((x) => ({ ...x, isRead: true })));
  }

  return (
    <div ref={innerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-text-muted hover:text-text transition-colors"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-border bg-surface shadow-lg z-30">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-medium text-text">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-brand hover:underline">Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No notifications.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors ${n.isRead ? '' : 'bg-brand-faint/50'}`}
                  >
                    <p className="text-sm text-text font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-text-faint mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;
