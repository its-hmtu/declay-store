'use client';

/**
 * M-42: staff inbox for live customer chat.
 *
 * Two live channels, deliberately separate:
 *  - an inbox-wide stream that tells us the queue changed (someone new is waiting)
 *  - a per-conversation stream, opened only for the thread currently on screen
 * Opening a stream per queued conversation would hold a Redis subscriber each.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Check, UserPlus } from 'lucide-react';
import type { InboxItem, LiveChatMessage, StaffTranscript } from '@/lib/types';
import { adminInboxApi } from '@/lib/api';
import { adminAuth } from '@/lib/auth';
import { openEventStream } from '@/lib/sse';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/** Presence expires server-side after 60s, so refresh comfortably inside that. */
const HEARTBEAT_MS = 30_000;

function waitLabel(seconds: number | null): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}

export default function InboxClient() {
  const [queue, setQueue]       = useState<InboxItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [active, setActive]     = useState<StaffTranscript | null>(null);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds   = useRef<Set<number>>(new Set());

  const loadQueue = useCallback(async () => {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminInboxApi.queue(token);
      setQueue(res.data ?? []);
    } catch {
      toast.error('Could not load the inbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Presence: this heartbeat is what decides whether a customer is offered a
  // human at all. If it stops, new conversations fall back to the email path.
  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    const timer = setInterval(() => { adminInboxApi.heartbeat(token).catch(() => {}); }, HEARTBEAT_MS);
    // Leaving the page marks us away rather than waiting for the TTL to lapse.
    const goOffline = () => { adminInboxApi.offline(token).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, []);

  // Queue-level stream: refresh the list when anything changes.
  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) return;
    return openEventStream('/admin/inbox/stream', token, {
      onEvent: (event) => { if (event === 'update') loadQueue(); },
    });
  }, [loadQueue]);

  // Conversation stream for the open thread only.
  useEffect(() => {
    const token = adminAuth.getToken();
    const sessionId = active?.session.id;
    if (!token || !sessionId) return;

    return openEventStream(`/admin/inbox/${sessionId}/stream`, token, {
      onEvent: (event, data) => {
        if (event !== 'update') return;
        const payload = data as { type?: string; message?: LiveChatMessage; mode?: string };

        if (payload.type === 'message' && payload.message) {
          const incoming = payload.message;
          if (seenIds.current.has(incoming.id)) return; // our own reply echoing back
          seenIds.current.add(incoming.id);
          setActive((cur) => (cur && cur.session.id === sessionId
            ? { ...cur, messages: [...cur.messages, incoming] }
            : cur));
        } else if (payload.type === 'mode' && payload.mode) {
          setActive((cur) => (cur && cur.session.id === sessionId
            ? { ...cur, session: { ...cur.session, mode: payload.mode as StaffTranscript['session']['mode'] } }
            : cur));
        }
      },
    });
  }, [active?.session.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages.length]);

  async function openConversation(id: number) {
    const token = adminAuth.getToken();
    if (!token) return;
    try {
      const res = await adminInboxApi.transcript(token, id);
      seenIds.current = new Set(res.data?.messages.map((m) => m.id) ?? []);
      setActive(res.data ?? null);
      await adminInboxApi.markRead(token, id).catch(() => {});
      loadQueue();
    } catch {
      toast.error('Could not open that conversation.');
    }
  }

  async function claim() {
    const token = adminAuth.getToken();
    if (!token || !active) return;
    try {
      await adminInboxApi.claim(token, active.session.id);
      await openConversation(active.session.id);
      loadQueue();
    } catch (err) {
      // Losing the race is normal, not a crash — a colleague got there first.
      toast.error(err instanceof Error ? err.message : 'Could not claim this conversation.');
      loadQueue();
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const token = adminAuth.getToken();
    const text = reply.trim();
    if (!token || !active || !text) return;

    setSending(true);
    try {
      const res = await adminInboxApi.send(token, active.session.id, text);
      const message = res.data;
      if (message) {
        seenIds.current.add(message.id);
        setActive((cur) => (cur ? { ...cur, messages: [...cur.messages, message] } : cur));
      }
      setReply('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reply failed.');
    } finally {
      setSending(false);
    }
  }

  async function close() {
    const token = adminAuth.getToken();
    if (!token || !active) return;
    try {
      await adminInboxApi.close(token, active.session.id);
      toast.success('Conversation closed.');
      setActive(null);
      loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not close.');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const mine = adminAuth.getAdminId();
  const canReply = active?.session.mode === 'live'
    && (active.session.assignedAdminId == null || active.session.assignedAdminId === mine);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-text">Inbox</h1>
        <p className="text-sm text-text-muted mt-1">
          Customers who asked to speak with a person. Keep this tab open — it is what marks you available.
        </p>
      </div>

      <div className="grid lg:grid-cols-[20rem_1fr] gap-5">
        {/* Queue */}
        <Card className="overflow-hidden py-0">
          {queue.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-text-muted">Nobody is waiting.</p>
          )}
          {queue.map((item) => (
            <button
              key={item.id}
              onClick={() => openConversation(item.id)}
              className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-surface-alt transition-colors ${
                active?.session.id === item.id ? 'bg-surface-alt' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-text text-sm truncate">
                  {item.customerName || (item.isGuest ? 'Guest' : `Customer #${item.userId}`)}
                </span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                  item.mode === 'waiting'
                    ? 'bg-warning/15 text-warning'
                    : 'bg-success/10 text-success'
                }`}>
                  {item.mode === 'waiting' ? `waiting ${waitLabel(item.waitingSeconds)}` : (item.assignedAdminName ?? 'live')}
                </span>
              </div>
              {item.reason && <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.reason}</p>}
              {item.hasUnread && <span className="inline-block mt-1 size-2 rounded-full bg-brand" aria-label="Unread" />}
            </button>
          ))}
        </Card>

        {/* Conversation */}
        <Card className=" flex flex-col min-h-[30rem]">
          {!active ? (
            <p className="m-auto text-sm text-text-muted">Select a conversation.</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">
                    {active.session.customerName || (active.session.userId ? `Customer #${active.session.userId}` : 'Guest')}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {active.session.customerEmail ?? 'No email left'}
                    {active.session.assignedAdminName && ` · handled by ${active.session.assignedAdminName}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {active.session.mode === 'waiting' && (
                    <Button size="sm" onClick={claim}><UserPlus size={14} /> Claim</Button>
                  )}
                  {active.session.mode !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={close}><Check size={14} /> Close</Button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[26rem]">
                {active.messages.map((m) => m.role === 'system' ? (
                  <p key={m.id} className="text-center text-xs text-text-muted">{m.content}</p>
                ) : (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[80%]">
                      <p className="text-[11px] text-text-muted mb-0.5 px-1">
                        {m.role === 'user' ? 'Customer' : m.role === 'staff' ? (m.authorName ?? 'Staff') : 'Assistant'}
                      </p>
                      <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        m.role === 'user' ? 'bg-surface-alt text-text'
                          : m.role === 'staff' ? 'bg-brand text-white'
                          : 'bg-surface-alt text-text-muted italic'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
                <Input
                  aria-label="Reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  disabled={!canReply}
                  placeholder={
                    active.session.mode === 'closed' ? 'This conversation is closed'
                      : canReply ? 'Type your reply…'
                      : 'Claim the conversation to reply'
                  }
                  className="flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim() || !canReply}
                  className="size-9 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40"
                  aria-label="Send reply"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
