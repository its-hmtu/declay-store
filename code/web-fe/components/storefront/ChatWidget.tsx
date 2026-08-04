'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { MessageCircle, X, Send } from 'lucide-react';
import { streamSSE } from '@/lib/sse';
import { auth } from '@/lib/auth';

interface Action { label: string; payload?: Record<string, unknown> }
interface Msg { role: 'user' | 'assistant'; text: string; actions?: Action[] }

export default function ChatWidget() {
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const sessionId = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { drawerOpen } = useCart();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  // If the cart drawer opens, hide/close the chat widget to avoid z-index clash.
  useEffect(() => {
    if (drawerOpen) setOpen(false);
  }, [drawerOpen]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    setBusy(true);

    await streamSSE('/chat', { message: text, sessionId: sessionId.current }, auth.getToken(), {
      onEvent: (event, data) => {
        if (event === 'session' && typeof data.sessionId === 'number') {
          sessionId.current = data.sessionId;
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
            <p className="font-serif font-semibold">Declay Assistant</p>
            <p className="text-xs text-white/70">Ask about products, orders & shipping</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <p className="text-sm text-text-muted">Hi! 👋 How can I help you find the perfect handmade figure today?</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-surface-alt text-text rounded-bl-sm'
                }`}>
                  {m.text || <span className="inline-block animate-pulse text-text-muted">…</span>}
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

          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand"
            />
            <button type="submit" disabled={busy || !input.trim()} className="size-9 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-light transition-colors" aria-label="Send">
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
