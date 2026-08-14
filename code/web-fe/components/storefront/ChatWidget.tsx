'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { MessageCircle, X, Send } from 'lucide-react';
import { streamSSE, openEventStream } from '@/lib/sse';
import { auth } from '@/lib/auth';
import { liveChatApi } from '@/lib/api';
import type { ChatMode, LiveChatMessage } from '@/lib/types';
import { chipsFor, type Chip } from '@/lib/chat-chips';
import type { TranslationKey } from '@/lib/i18n/dictionaries';
import { useT } from '@/lib/i18n/LocaleProvider';

interface Action { label: string; payload?: Record<string, unknown> }
interface Msg {
  role: 'user' | 'assistant' | 'staff' | 'system';
  text: string;
  actions?: Action[];
  authorName?: string | null;
  /** Server id — used to drop echoes of messages we already rendered optimistically. */
  id?: number;
}

/** Gives staff a one-line summary of what the customer was stuck on. */
function lastCustomerQuestion(msgs: Msg[]): string | null {
  const last = [...msgs].reverse().find((m) => m.role === 'user' && m.text.trim());
  return last ? last.text.slice(0, 255) : null;
}

export default function ChatWidget() {
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  // M-42: handoff state.
  const [mode, setMode]       = useState<ChatMode>('bot');
  const [staffName, setStaff] = useState<string | null>(null);
  const [asking, setAsking]   = useState(false);   // "leave your email" form is open
  const [email, setEmail]     = useState('');
  const [notice, setNotice]   = useState<string | null>(null);
  const sessionId = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds   = useRef<Set<number>>(new Set());

  const { drawerOpen } = useCart();
  const { t } = useT();
  const live = mode === 'waiting' || mode === 'live';

  // M-43: which quick-reply chips make sense right now.
  const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
  const chips = chipsFor({
    messageCount: msgs.length,
    signedIn: !!auth.getToken(),
    mode,
    lastAssistantText: lastAssistant?.text,
    busy,
  });

  function onChip(chip: Chip) {
    if (chip.kind === 'navigate' && chip.href) {
      window.location.href = chip.href;
      return;
    }
    if (chip.kind === 'handoff') {
      requestHuman();
      return;
    }
    // `ask`: send the prompt text, not the button label — the label is a menu
    // item ("Returns"), the prompt is a question the model can actually answer.
    if (chip.promptKey) sendMessage(t(chip.promptKey as TranslationKey));
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  // If the cart drawer opens, hide/close the chat widget to avoid z-index clash.
  useEffect(() => {
    if (drawerOpen) setOpen(false);
  }, [drawerOpen]);

  /**
   * M-42: while a human owns the conversation, staff replies arrive over SSE.
   * The stream is only opened once escalated — an idle bot chat should not hold a
   * Redis subscriber open on the server for every browser tab on the site.
   */
  useEffect(() => {
    if (!live || !sessionId.current) return;
    const close = openEventStream(`/chat/live/${sessionId.current}/stream`, auth.getToken(), {
      onEvent: (event, data) => {
        if (event !== 'update') return;
        const payload = data as { type?: string; message?: LiveChatMessage; mode?: ChatMode; staffName?: string | null };

        if (payload.type === 'message' && payload.message) {
          const incoming = payload.message;
          // Our own message comes back over the bus — do not render it twice.
          if (seenIds.current.has(incoming.id)) return;
          seenIds.current.add(incoming.id);
          if (incoming.role === 'user') return;
          setMsgs((m) => [...m, {
            role: incoming.role,
            text: incoming.content,
            authorName: incoming.authorName,
            id: incoming.id,
          }]);
        } else if (payload.type === 'mode' && payload.mode) {
          setMode(payload.mode);
          if (payload.staffName) setStaff(payload.staffName);
        }
      },
    });
    return close;
  }, [live]);

  /** M-42: ask for a human. Idempotent server-side, so double-clicks are harmless. */
  async function requestHuman() {
    if (!sessionId.current || busy) return;
    setBusy(true);
    try {
      const res = await liveChatApi.requestHandoff(
        sessionId.current,
        { reason: lastCustomerQuestion(msgs), email: email.trim() || null },
        auth.getToken(),
      );
      setMode((res.data?.mode as ChatMode) ?? 'waiting');
      setNotice(res.data?.acknowledgement ?? null);
      // Nobody online and no address to reply to → ask once, do not nag.
      setAsking(!res.data?.staffOnline && !email.trim());
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not reach the team right now.');
    } finally {
      setBusy(false);
    }
  }

  /** Send while a human owns the conversation — plain POST, reply arrives over SSE. */
  async function sendToStaff(text: string) {
    if (!sessionId.current) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await liveChatApi.send(sessionId.current, text, auth.getToken());
      if (res.data?.id) seenIds.current.add(res.data.id);
    } catch (err) {
      setMsgs((m) => [...m, {
        role: 'system',
        text: err instanceof Error ? err.message : 'Message failed to send.',
      }]);
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');

    // M-42: once escalated the bot stays quiet — route to the staff thread instead.
    if (live) return sendToStaff(text);

    setMsgs((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    setBusy(true);

    await streamSSE('/chat', { message: text, sessionId: sessionId.current }, auth.getToken(), {
      onEvent: (event, data) => {
        if (event === 'session' && typeof data.sessionId === 'number') {
          sessionId.current = data.sessionId;
          if (typeof data.mode === 'string') setMode(data.mode as ChatMode);
        } else if (event === 'handoff') {
          // Server refused to let the bot answer — a human owns this thread now.
          if (typeof data.mode === 'string') setMode(data.mode as ChatMode);
          setMsgs((m) => m.slice(0, -1)); // drop the empty assistant placeholder
        } else if (event === 'delta' && typeof data.text === 'string') {
          setMsgs((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', text: next[next.length - 1].text + data.text };
            return next;
          });
        } else if (event === 'actions' && Array.isArray(data.actions)) {
          // Attach actions to the last assistant message
          setMsgs((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, actions: data.actions as Action[] };
            }
            return next;
          });
        } else if (event === 'error') {
          setMsgs((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', text: `⚠️ ${data.message ?? 'Something went wrong.'}` };
            return next;
          });
        }
      },
      onError: (message) => {
        setMsgs((m) => {
          const next = [...m];
          next[next.length - 1] = { role: 'assistant', text: `⚠️ ${message}` };
          return next;
        });
      },
    });
    setBusy(false);
  }

  async function sendMessage(text: string) {
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    setBusy(true);
    await streamSSE('/chat', { message: text, sessionId: sessionId.current }, auth.getToken(), {
      onEvent: (event, data) => {
        if (event === 'session' && typeof data.sessionId === 'number') {
          sessionId.current = data.sessionId;
          if (typeof data.mode === 'string') setMode(data.mode as ChatMode);
        } else if (event === 'handoff') {
          // Server refused to let the bot answer — a human owns this thread now.
          if (typeof data.mode === 'string') setMode(data.mode as ChatMode);
          setMsgs((m) => m.slice(0, -1)); // drop the empty assistant placeholder
        } else if (event === 'delta' && typeof data.text === 'string') {
          setMsgs((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', text: next[next.length - 1].text + data.text };
            return next;
          });
        } else if (event === 'actions' && Array.isArray(data.actions)) {
          setMsgs((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, actions: data.actions as Action[] };
            }
            return next;
          });
        } else if (event === 'error') {
          setMsgs((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', text: `⚠️ ${data.message ?? 'Something went wrong.'}` };
            return next;
          });
        }
      },
      onError: (message) => {
        setMsgs((m) => {
          const next = [...m];
          next[next.length - 1] = { role: 'assistant', text: `⚠️ ${message}` };
          return next;
        });
      },
    });
    setBusy(false);
  }

  return (
    <>
      {/* Launcher */}
      {!drawerOpen && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center hover:bg-brand-light transition-colors"
            aria-label="Chat with us"
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </button>

          {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[22rem] max-w-[calc(100vw-2.5rem)] h-[28rem] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-brand text-white">
            <p className="font-serif font-semibold">
              {mode === 'live' ? (staffName ?? 'Declay Support') : 'Declay Assistant'}
            </p>
            <p className="text-xs text-white/70">
              {mode === 'live' ? 'You are chatting with our team'
                : mode === 'waiting' ? 'Waiting for someone from the team…'
                : mode === 'closed' ? 'This conversation has ended'
                : 'Ask about products, orders & shipping'}
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <p className="text-sm text-text-muted">Hi! 👋 How can I help you find the perfect handmade figure today?</p>
            )}
            {msgs.map((m, i) => m.role === 'system' ? (
              // M-42: transcript markers ("Mai joined") are notes, not bubbles.
              <p key={i} className="text-center text-xs text-text-muted px-4">{m.text}</p>
            ) : (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {m.role === 'staff' && m.authorName && (
                    <p className="text-[11px] text-text-muted mb-0.5 px-1">{m.authorName}</p>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-brand text-white rounded-br-sm'
                      : m.role === 'staff' ? 'bg-accent/10 border border-accent/30 text-text rounded-bl-sm'
                      : 'bg-surface-alt text-text rounded-bl-sm'
                  }`}>
                    {m.text || <span className="inline-block animate-pulse text-text-muted">…</span>}
                  </div>
                </div>
                {/* Actions (buttons) attached to assistant messages */}
                {m.role === 'assistant' && m.actions && (
                  <div className="mt-2 flex gap-2 flex-wrap w-full px-3">
                    {m.actions.map((a, ai) => (
                      <button
                        key={ai}
                        onClick={() => {
                          // If payload indicates navigation, prefer that; otherwise send as message
                          const payload = a.payload as any;
                          if (payload?.type === 'view_product' && payload.productId) {
                            // navigate to product page
                            window.location.href = `/products/${payload.productId}`;
                            return;
                          }
                          sendMessage(a.label);
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-surface-alt border border-border text-text hover:bg-surface"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {notice && <p className="px-4 pb-1 text-xs text-text-muted">{notice}</p>}

          {/* M-43: quick-reply chips. `chipsFor` decides what belongs here —
              starters on an empty chat, follow-ups afterwards, nothing once a
              human owns the thread. Escalation is one of these chips, and only
              appears once there is a conversation worth handing over. */}
          {chips.length > 0 && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onChip(chip)}
                  disabled={chip.kind === 'handoff' && !sessionId.current}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                    chip.kind === 'handoff'
                      ? 'border-brand/40 text-brand hover:bg-brand/5'
                      : 'border-border text-text-muted hover:text-text hover:border-brand'
                  }`}
                >
                  {t(chip.labelKey as TranslationKey)}
                </button>
              ))}
            </div>
          )}

          {asking && (
            <form
              className="px-3 pb-2 flex gap-2"
              onSubmit={(e) => { e.preventDefault(); setAsking(false); requestHuman(); }}
            >
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email, so we can reply"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand"
              />
              <button type="submit" className="text-xs px-3 rounded-lg bg-brand text-white">Send</button>
            </form>
          )}

          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={mode === 'closed'}
              placeholder={
                mode === 'closed' ? 'Conversation ended'
                  : mode === 'waiting' ? 'Keep typing — the team will read this'
                  : 'Type a message…'
              }
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand disabled:opacity-50"
            />
            <button type="submit" disabled={busy || !input.trim() || mode === 'closed'} className="size-9 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-light transition-colors" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
          )}
        </>
      )}
    </>
  );
}
