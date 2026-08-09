/**
 * M-42: live-chat state machine + access rules. Pure, no I/O — this is where the
 * rules live so they can be tested without a database, the same way order status
 * transitions are handled in `order.pricing.ts`.
 *
 * bot ──requestHandoff──▶ waiting ──claim──▶ live ──close──▶ closed
 *  ▲                        │                  │
 *  └────────── close ───────┴────── close ─────┘
 *
 * Deliberate choices:
 * - `closed` is terminal. Reopening would let a customer resurrect a conversation
 *   a staff member already wrapped up; they start a new session instead.
 * - A session in `waiting`/`live` does NOT get bot replies. Two voices answering
 *   the same question is worse than a short silence.
 */
import type { ChatMode } from './chat.entity';

export const CHAT_MODES: ChatMode[] = ['bot', 'waiting', 'live', 'closed'];

const ALLOWED: Record<ChatMode, ChatMode[]> = {
  bot: ['waiting', 'closed'],
  waiting: ['live', 'closed', 'bot'], // back to 'bot' when the customer cancels the request
  live: ['closed'],
  closed: [],
};

export function canTransition(from: ChatMode, to: ChatMode): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Returns an error message when the move is illegal, or null when it is fine. */
export function transitionError(from: ChatMode, to: ChatMode): string | null {
  if (from === to) return null; // idempotent — clicking "close" twice is not an error
  if (!CHAT_MODES.includes(to)) return `Unknown chat mode: ${to}`;
  if (from === 'closed') return 'This conversation is closed. Start a new chat.';
  if (!canTransition(from, to)) return `Cannot move a ${from} conversation to ${to}`;
  return null;
}

/** The AI only answers while nobody human owns the conversation. */
export function botShouldReply(mode: ChatMode): boolean {
  return mode === 'bot';
}

/** Customers may keep typing while queued — their messages are what staff will read. */
export function customerCanSend(mode: ChatMode): boolean {
  return mode !== 'closed';
}

/**
 * Ownership: a claimed conversation belongs to one staff member so two people do
 * not answer at once. Super admins can always step in — someone has to be able to
 * rescue a conversation when the assignee goes home.
 */
export function staffCanSend(
  mode: ChatMode,
  assignedAdminId: number | null,
  actorAdminId: number,
  actorRole?: string | null,
): { allowed: boolean; reason?: string } {
  if (mode === 'closed') return { allowed: false, reason: 'This conversation is closed' };
  if (mode === 'bot') return { allowed: false, reason: 'Claim the conversation before replying' };
  if (mode === 'waiting') return { allowed: false, reason: 'Claim the conversation before replying' };
  if (assignedAdminId != null && assignedAdminId !== actorAdminId && actorRole !== 'super_admin') {
    return { allowed: false, reason: 'Another staff member is handling this conversation' };
  }
  return { allowed: true };
}

/**
 * Queue order for the staff inbox: unclaimed conversations first, then oldest
 * request first. Someone who has waited eight minutes outranks a fresh arrival.
 */
export interface QueueItem {
  id: number;
  mode: ChatMode;
  handoffRequestedAt: Date | string | null;
}

export function sortQueue<T extends QueueItem>(items: T[]): T[] {
  const rank = (m: ChatMode) => (m === 'waiting' ? 0 : m === 'live' ? 1 : 2);
  return [...items].sort((a, b) => {
    const byMode = rank(a.mode) - rank(b.mode);
    if (byMode !== 0) return byMode;
    return time(a.handoffRequestedAt) - time(b.handoffRequestedAt);
  });
}

function time(value: Date | string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER; // no request time → sorts last
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

/**
 * What the customer is told when they ask for a human. Copy lives here rather than
 * in the component so the promise we make matches the state we actually entered.
 */
export function handoffAcknowledgement(staffOnline: boolean, hasContactEmail: boolean): string {
  if (staffOnline) {
    return 'Connecting you with someone from our team — this usually takes a moment.';
  }
  return hasContactEmail
    ? 'Nobody is available right now, but your message has been sent to the team and we will reply by email.'
    : 'Nobody is available right now. Leave your email and we will get back to you — or keep typing and we will read it as soon as we are back.';
}
