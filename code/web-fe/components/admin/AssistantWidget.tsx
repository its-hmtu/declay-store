'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, AlertTriangle } from 'lucide-react';
import { streamSSE } from '@/lib/sse';
import { adminAuth } from '@/lib/auth';

interface Msg { role: 'user' | 'assistant'; text: string }
interface PendingAction { name: string; input: Record<string, unknown>; destructive: boolean }
interface Pending { pendingId: string; actions: PendingAction[] }

export default function AssistantWidget() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const sessionId = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open, pending]);

  function appendDelta(text: string) {
    setMsgs((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') next[next.length - 1] = { role: 'assistant', text: last.text + text };
      else next.push({ role: 'assistant', text });
      return next;
    });
  }

  async function runStream(path: string, body: unknown) {
    setBusy(true);
    await streamSSE(path, body, adminAuth.getToken(), {
      onEvent: (event, data) => {
        if (event === 'session' && typeof data.sessionId === 'number') {
          sessionId.current = data.sessionId;
        } else if (event === 'delta' && typeof data.text === 'string') {
          appendDelta(data.text);
        } else if (event === 'tool' && typeof data.name === 'string') {
          appendDelta(`\n_⚙️ ${data.name}_\n`);
        } else if (event === 'confirm') {
          setPending({ pendingId: String(data.pendingId), actions: (data.actions as PendingAction[]) ?? [] });
        } else if (event === 'error') {
          appendDelta(`\n⚠️ ${data.message ?? 'Something went wrong.'}`);
        }
      },
      onError: (message) => appendDelta(`\n⚠️ ${message}`),
    });
    setBusy(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    await runStream('/admin/assistant', { message: text, sessionId: sessionId.current });
  }

  async function resolve(approved: boolean) {
    if (!pending) return;
    const { pendingId } = pending;
    setPending(null);
    setMsgs((m) => [...m, { role: 'assistant', text: '' }]);
    await runStream('/admin/assistant/confirm', { pendingId, approved });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center hover:bg-brand-light transition-colors"
        aria-label="AI Assistant"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[24rem] max-w-[calc(100vw-2.5rem)] h-[32rem] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-brand text-white">
            <p className="font-serif font-semibold flex items-center gap-2"><Sparkles size={16} /> AI Assistant</p>
            <p className="text-xs text-white/70">Create products, publish articles, update orders…</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <p className="text-sm text-text-muted">Try: “Create a product called Jade Tiger in Dragon Figures” or “How many orders are pending?”</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-surface-alt text-text rounded-bl-sm'
                }`}>
                  {m.text || <span className="inline-block animate-pulse text-text-muted">…</span>}
                </div>
              </div>
            ))}

            {pending && (
              <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-text mb-2">
                  <AlertTriangle size={15} className="text-warning" /> Confirm action
                </p>
                <ul className="space-y-1 mb-3">
                  {pending.actions.map((a, i) => (
                    <li key={i} className="text-text-muted">
                      <span className={`font-mono ${a.destructive ? 'text-error' : 'text-text'}`}>{a.name}</span>
                      <span className="text-xs"> {JSON.stringify(a.input)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button onClick={() => resolve(true)} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-light">Approve</button>
                  <button onClick={() => resolve(false)} className="px-3 py-1.5 rounded-lg border border-border text-text-muted text-xs font-medium hover:bg-surface-alt">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!pending}
              placeholder={pending ? 'Resolve the action above first…' : 'Ask the assistant…'}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand disabled:opacity-50"
            />
            <button type="submit" disabled={busy || !!pending || !input.trim()} className="size-9 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-light transition-colors" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
