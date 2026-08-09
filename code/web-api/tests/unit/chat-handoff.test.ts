import { describe, it, expect } from 'vitest';
import {
  canTransition, transitionError, botShouldReply, customerCanSend, staffCanSend,
  sortQueue, handoffAcknowledgement,
} from '@/modules/chat/chat.handoff';

describe('chat mode transitions', () => {
  it('allows the normal escalation path', () => {
    expect(canTransition('bot', 'waiting')).toBe(true);
    expect(canTransition('waiting', 'live')).toBe(true);
    expect(canTransition('live', 'closed')).toBe(true);
  });

  it('lets a customer cancel a request and fall back to the bot', () => {
    expect(canTransition('waiting', 'bot')).toBe(true);
  });

  it('refuses to hand a live conversation back to the bot', () => {
    // Two voices answering the same person is the failure mode this prevents.
    expect(canTransition('live', 'bot')).toBe(false);
    expect(transitionError('live', 'bot')).toMatch(/cannot/i);
  });

  it('treats closed as terminal', () => {
    expect(canTransition('closed', 'live')).toBe(false);
    expect(canTransition('closed', 'bot')).toBe(false);
    expect(transitionError('closed', 'live')).toMatch(/closed/i);
  });

  it('is idempotent for a no-op transition', () => {
    // Clicking "close" twice must not surface an error to staff.
    expect(transitionError('closed', 'closed')).toBeNull();
    expect(transitionError('live', 'live')).toBeNull();
  });

  it('rejects an unknown mode', () => {
    expect(transitionError('bot', 'archived' as never)).toMatch(/unknown/i);
  });
});

describe('who may speak', () => {
  it('only lets the bot answer while nobody human owns the thread', () => {
    expect(botShouldReply('bot')).toBe(true);
    expect(botShouldReply('waiting')).toBe(false);
    expect(botShouldReply('live')).toBe(false);
    expect(botShouldReply('closed')).toBe(false);
  });

  it('lets a queued customer keep typing', () => {
    // Their messages are exactly the context staff will need.
    expect(customerCanSend('waiting')).toBe(true);
    expect(customerCanSend('live')).toBe(true);
    expect(customerCanSend('closed')).toBe(false);
  });

  it('requires staff to claim before replying', () => {
    expect(staffCanSend('waiting', null, 1).allowed).toBe(false);
    expect(staffCanSend('waiting', null, 1).reason).toMatch(/claim/i);
    expect(staffCanSend('bot', null, 1).allowed).toBe(false);
  });

  it('lets the assignee reply', () => {
    expect(staffCanSend('live', 7, 7).allowed).toBe(true);
  });

  it("blocks a colleague from talking over the assignee", () => {
    const result = staffCanSend('live', 7, 9);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/another staff member/i);
  });

  it('lets a super admin step in — someone must be able to rescue a thread', () => {
    expect(staffCanSend('live', 7, 9, 'super_admin').allowed).toBe(true);
  });

  it('blocks everyone once closed', () => {
    expect(staffCanSend('closed', 7, 7).allowed).toBe(false);
    expect(staffCanSend('closed', 7, 7, 'super_admin').allowed).toBe(false);
  });
});

describe('inbox queue order', () => {
  const t = (iso: string) => new Date(iso);

  it('puts unclaimed conversations above claimed ones', () => {
    const sorted = sortQueue([
      { id: 1, mode: 'live', handoffRequestedAt: t('2026-08-06T10:00:00Z') },
      { id: 2, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:05:00Z') },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([2, 1]);
  });

  it('serves the longest wait first within the same state', () => {
    const sorted = sortQueue([
      { id: 1, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:05:00Z') },
      { id: 2, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:00:00Z') },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([2, 1]);
  });

  it('sorts rows with no request time last instead of crashing', () => {
    const sorted = sortQueue([
      { id: 1, mode: 'waiting', handoffRequestedAt: null },
      { id: 2, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:00:00Z') },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([2, 1]);
  });

  it('tolerates an unparseable date', () => {
    const sorted = sortQueue([
      { id: 1, mode: 'waiting', handoffRequestedAt: 'not-a-date' },
      { id: 2, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:00:00Z') },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([2, 1]);
  });

  it('does not mutate the input array', () => {
    const input: Array<{ id: number; mode: 'waiting'; handoffRequestedAt: Date }> = [
      { id: 1, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:05:00Z') },
      { id: 2, mode: 'waiting', handoffRequestedAt: t('2026-08-06T10:00:00Z') },
    ];
    sortQueue(input);
    expect(input.map((i) => i.id)).toEqual([1, 2]);
  });
});

describe('handoff acknowledgement copy', () => {
  it('promises a person when someone is online', () => {
    expect(handoffAcknowledgement(true, false)).toMatch(/connecting you/i);
  });

  it('promises an email reply when we have an address', () => {
    expect(handoffAcknowledgement(false, true)).toMatch(/reply by email/i);
  });

  it('asks for an address when we have none — never a dead end', () => {
    const copy = handoffAcknowledgement(false, false);
    expect(copy).toMatch(/leave your email/i);
    expect(copy).toMatch(/keep typing/i);
  });
});
