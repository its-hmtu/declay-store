/**
 * M-43: quick-reply chips for the storefront chatbot.
 *
 * Two kinds, and the distinction matters:
 *
 * - `ask`      → sends the text to the bot as if the customer typed it.
 * - `navigate` → goes straight to a page.
 *
 * Browsing intents ("what's new", "what sells best") are `navigate`, NOT `ask`.
 * The bot's `search_products` tool takes a keyword and cannot sort, so asking it
 * for "new arrivals" produces a vague keyword search, while `/products?sort=newest`
 * already answers the question exactly. Routing a request to the weaker mechanism
 * because it feels more conversational is a bad trade.
 *
 * Pure — no React, no network — so the selection rules can be tested directly.
 */

export type ChipKind = 'ask' | 'navigate' | 'handoff';

export interface Chip {
  id: string;
  /** i18n key; the component resolves it. Never hardcode a label here. */
  labelKey: string;
  kind: ChipKind;
  /** For `ask`: the message sent to the bot. Also an i18n key. */
  promptKey?: string;
  /** For `navigate`: destination path. */
  href?: string;
}

/** Shown when the conversation is empty. Keep to ~5 — more reads as a menu and gets ignored. */
export const STARTER_CHIPS: Chip[] = [
  { id: 'new-arrivals', labelKey: 'chat.chip.newArrivals', kind: 'navigate', href: '/products?sort=newest' },
  { id: 'best-sellers', labelKey: 'chat.chip.bestSellers', kind: 'navigate', href: '/products?sort=best-sellers' },
  { id: 'shipping', labelKey: 'chat.chip.shipping', kind: 'ask', promptKey: 'chat.chip.shippingPrompt' },
  { id: 'payment', labelKey: 'chat.chip.payment', kind: 'ask', promptKey: 'chat.chip.paymentPrompt' },
  { id: 'returns', labelKey: 'chat.chip.returns', kind: 'ask', promptKey: 'chat.chip.returnsPrompt' },
];

const MY_ORDERS: Chip = {
  id: 'my-orders', labelKey: 'chat.chip.myOrders', kind: 'ask', promptKey: 'chat.chip.myOrdersPrompt',
};
const SIGN_IN: Chip = { id: 'sign-in', labelKey: 'chat.chip.signIn', kind: 'navigate', href: '/login' };
const READ_POLICY: Chip = { id: 'read-policy', labelKey: 'chat.chip.readPolicy', kind: 'navigate', href: '/policies' };
const TALK_TO_HUMAN: Chip = { id: 'handoff', labelKey: 'chat.chip.talkToPerson', kind: 'handoff' };

export interface ChipContext {
  /** Empty conversation → starters. */
  messageCount: number;
  signedIn: boolean;
  /** waiting/live/closed → chips are irrelevant, a human owns the thread. */
  mode: 'bot' | 'waiting' | 'live' | 'closed';
  /** Text of the bot's most recent reply, used to spot an unhelpful answer. */
  lastAssistantText?: string;
  /** True while the bot is still streaming — do not offer follow-ups mid-sentence. */
  busy?: boolean;
}

/**
 * Phrases that mean "I could not help". When the bot says one of these, the most
 * useful next tap is a human, not another question — so that chip is promoted.
 * Matching is deliberately loose and bilingual; a false positive only costs an
 * extra button, a false negative leaves the customer stuck.
 */
const UNSURE_MARKERS = [
  "i don't know", 'i do not know', 'not sure', "i can't", 'i cannot', 'unable to',
  'contact', 'sorry',
  'không biết', 'không chắc', 'không thể', 'xin lỗi', 'liên hệ',
];

export function looksUnsure(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return UNSURE_MARKERS.some((marker) => lower.includes(marker));
}

/** Which chips to show right now. Returns [] when chips would be noise. */
export function chipsFor(context: ChipContext): Chip[] {
  const { messageCount, signedIn, mode, lastAssistantText, busy } = context;

  // A human owns the thread — canned prompts to a bot that is not listening would
  // be misleading, and "talk to a person" is already redundant.
  if (mode !== 'bot') return [];
  if (busy) return [];

  if (messageCount === 0) {
    // No handoff chip yet: escalating an empty conversation gives staff nothing
    // to work from. The widget offers it once there is something to hand over.
    return STARTER_CHIPS;
  }

  const chips: Chip[] = [];

  // The bot admitted defeat — lead with the escape hatch.
  if (looksUnsure(lastAssistantText)) chips.push(TALK_TO_HUMAN);

  chips.push(signedIn ? MY_ORDERS : SIGN_IN);
  chips.push(READ_POLICY);

  if (!looksUnsure(lastAssistantText)) chips.push(TALK_TO_HUMAN);

  return chips;
}
