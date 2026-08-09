/**
 * Chips live in the frontend (`web-fe/lib/chat-chips.ts`), which still has no test
 * runner of its own (backlog W-45).
 *
 * Rather than leave the rules untested until then, this imports the REAL module by
 * relative path — the API package's vitest can reach it. Copying the logic here
 * instead would let the copy and the original drift apart silently, which is the
 * exact failure the pricing rewrite had to undo.
 *
 * Move this file to the frontend once W-45 lands.
 */
import { describe, it, expect } from 'vitest';
import {
  chipsFor, looksUnsure, STARTER_CHIPS, type ChipContext,
} from '../../../web-fe/lib/chat-chips';

function ctx(over: Partial<ChipContext> = {}): ChipContext {
  return { messageCount: 2, signedIn: false, mode: 'bot', ...over };
}

describe('starter chips', () => {
  it('shows starters on an empty conversation', () => {
    const chips = chipsFor(ctx({ messageCount: 0 }));
    expect(chips).toEqual(STARTER_CHIPS);
  });

  it('does not offer a handoff before there is anything to hand over', () => {
    // Escalating an empty chat gives staff no context to work from.
    const chips = chipsFor(ctx({ messageCount: 0 }));
    expect(chips.some((c) => c.kind === 'handoff')).toBe(false);
  });

  it('routes browsing intents to navigation, not to the bot', () => {
    // search_products cannot sort, so "new arrivals" must not become a keyword search.
    const browsing = STARTER_CHIPS.filter((c) => ['new-arrivals', 'best-sellers'].includes(c.id));
    expect(browsing).toHaveLength(2);
    for (const chip of browsing) {
      expect(chip.kind).toBe('navigate');
      expect(chip.href).toMatch(/^\/products\?sort=/);
    }
  });

  it('routes policy questions to the bot', () => {
    const policy = STARTER_CHIPS.filter((c) => ['shipping', 'payment', 'returns'].includes(c.id));
    expect(policy).toHaveLength(3);
    for (const chip of policy) {
      expect(chip.kind).toBe('ask');
      expect(chip.promptKey).toBeTruthy();
    }
  });

  it('keeps the starter row short enough to read', () => {
    expect(STARTER_CHIPS.length).toBeLessThanOrEqual(6);
  });
});

describe('follow-up chips', () => {
  it('offers order lookup to a signed-in customer', () => {
    const chips = chipsFor(ctx({ signedIn: true }));
    expect(chips.map((c) => c.id)).toContain('my-orders');
    expect(chips.map((c) => c.id)).not.toContain('sign-in');
  });

  it('offers sign-in instead to a guest', () => {
    const chips = chipsFor(ctx({ signedIn: false }));
    expect(chips.map((c) => c.id)).toContain('sign-in');
    expect(chips.map((c) => c.id)).not.toContain('my-orders');
  });

  it('always leaves an escape hatch to a human', () => {
    expect(chipsFor(ctx()).some((c) => c.kind === 'handoff')).toBe(true);
  });
});

describe('promoting the handoff when the bot is stuck', () => {
  it('puts the human chip first when the bot admits it does not know', () => {
    const chips = chipsFor(ctx({ lastAssistantText: "Sorry, I don't know that." }));
    expect(chips[0].kind).toBe('handoff');
  });

  it('leaves it last on a confident answer', () => {
    const chips = chipsFor(ctx({ lastAssistantText: 'Shipping takes 5-7 days.' }));
    expect(chips[0].kind).not.toBe('handoff');
    expect(chips[chips.length - 1].kind).toBe('handoff');
  });

  it('detects uncertainty in Vietnamese too', () => {
    expect(looksUnsure('Xin lỗi, mình không chắc về điều này.')).toBe(true);
    expect(looksUnsure('Mình không biết ạ.')).toBe(true);
  });

  it('does not flag a normal answer', () => {
    expect(looksUnsure('Phí ship là 30.000đ.')).toBe(false);
    expect(looksUnsure(undefined)).toBe(false);
  });
});

describe('when chips would be noise', () => {
  it('hides them once a human owns the thread', () => {
    // Canned prompts to a bot that is no longer listening would mislead.
    for (const mode of ['waiting', 'live', 'closed'] as const) {
      expect(chipsFor(ctx({ mode }))).toEqual([]);
      expect(chipsFor(ctx({ mode, messageCount: 0 }))).toEqual([]);
    }
  });

  it('hides them while the bot is still streaming', () => {
    expect(chipsFor(ctx({ busy: true }))).toEqual([]);
  });
});
