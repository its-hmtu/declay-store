/**
 * M-42: live-chat message bus (Redis pub/sub).
 *
 * Why pub/sub and not "just query the DB": an SSE connection is pinned to ONE
 * node process. When a staff member replies, the write may land on a different
 * instance than the one holding the customer's open stream. Redis is the only
 * thing both instances share, so it carries the fan-out.
 *
 * Why not WebSocket: the shop already streams AI replies over SSE and already
 * runs ioredis. Chat is overwhelmingly server→client (staff replies arriving);
 * the client→server direction is a plain POST. Adding socket.io would buy
 * bidirectionality we do not need, at the cost of a new dependency and sticky
 * sessions in front of it.
 *
 * ioredis requires a DEDICATED connection for subscribing — a client in
 * subscriber mode refuses normal commands — hence the separate lazily-created
 * subscriber below.
 */
import Redis from 'ioredis';
import { redisConfig } from '@/config/redis';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

const CHANNEL_PREFIX = 'chat:session:';
/** Staff inbox fan-out: new conversations entering the queue. */
export const INBOX_CHANNEL = 'chat:inbox';

/** Presence key TTL. A staff heartbeat refreshes it; if the tab dies it expires. */
const PRESENCE_TTL_SECONDS = 60;
const PRESENCE_KEY = 'chat:staff:online';

export type ChatBusEvent =
  | { type: 'message'; sessionId: number; message: PublishedMessage }
  | { type: 'mode'; sessionId: number; mode: string; staffName?: string | null }
  | { type: 'typing'; sessionId: number; who: 'staff' | 'customer' };

export interface PublishedMessage {
  id: number;
  role: string;
  content: string;
  authorName: string | null;
  createdAt: string;
}

function channelFor(sessionId: number): string {
  return `${CHANNEL_PREFIX}${sessionId}`;
}

/** Fire-and-forget: a failed publish must never break the HTTP request that caused it. */
export async function publishToSession(sessionId: number, event: ChatBusEvent): Promise<void> {
  try {
    await getRedisClient().publish(channelFor(sessionId), JSON.stringify(event));
  } catch (err) {
    logger.warn('chat-bus publish failed', { sessionId, error: String(err) });
  }
}

export async function publishToInbox(payload: unknown): Promise<void> {
  try {
    await getRedisClient().publish(INBOX_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    logger.warn('chat-bus inbox publish failed', { error: String(err) });
  }
}

/**
 * Subscribe to one session's channel. Returns an unsubscribe function that the
 * SSE route MUST call on connection close — otherwise every dropped browser tab
 * leaks a Redis connection.
 */
export function subscribeToSession(
  sessionId: number,
  onEvent: (event: ChatBusEvent) => void,
): () => void {
  return subscribe(channelFor(sessionId), onEvent as (e: unknown) => void);
}

export function subscribeToInbox(onEvent: (event: unknown) => void): () => void {
  return subscribe(INBOX_CHANNEL, onEvent);
}

function subscribe(channel: string, onEvent: (event: unknown) => void): () => void {
  // One dedicated connection per subscriber — ioredis puts the whole client into
  // subscriber mode, so this cannot share the pooled command client.
  const sub = new Redis(redisConfig);
  let closed = false;

  sub.on('error', (err) => logger.warn('chat-bus subscriber error', { channel, error: String(err) }));

  sub.subscribe(channel).catch((err) => {
    logger.warn('chat-bus subscribe failed', { channel, error: String(err) });
  });

  sub.on('message', (_ch, raw) => {
    if (closed) return;
    try {
      onEvent(JSON.parse(raw));
    } catch {
      // A malformed payload must not kill the stream for everyone else.
    }
  });

  return () => {
    if (closed) return;
    closed = true;
    sub.disconnect();
  };
}

// ── Staff presence ────────────────────────────────────────────
// A sorted set keyed by admin id, scored by "last seen". Cheap to read on every
// customer page load ("is anyone there?") and self-healing: stale entries are
// pruned on read rather than needing a cleanup job.

export async function markStaffOnline(adminId: number, name: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.hset(PRESENCE_KEY, String(adminId), JSON.stringify({ name, at: Date.now() }));
    await redis.expire(PRESENCE_KEY, PRESENCE_TTL_SECONDS * 10);
  } catch (err) {
    logger.warn('presence write failed', { adminId, error: String(err) });
  }
}

export async function markStaffOffline(adminId: number): Promise<void> {
  try {
    await getRedisClient().hdel(PRESENCE_KEY, String(adminId));
  } catch (err) {
    logger.warn('presence delete failed', { adminId, error: String(err) });
  }
}

export async function getOnlineStaff(): Promise<Array<{ adminId: number; name: string }>> {
  try {
    const redis = getRedisClient();
    const raw = await redis.hgetall(PRESENCE_KEY);
    const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
    const online: Array<{ adminId: number; name: string }> = [];
    const stale: string[] = [];

    for (const [id, value] of Object.entries(raw ?? {})) {
      try {
        const parsed = JSON.parse(value) as { name: string; at: number };
        if (parsed.at >= cutoff) online.push({ adminId: Number(id), name: parsed.name });
        else stale.push(id);
      } catch {
        stale.push(id);
      }
    }

    if (stale.length) await redis.hdel(PRESENCE_KEY, ...stale);
    return online;
  } catch (err) {
    logger.warn('presence read failed', { error: String(err) });
    // Fail "nobody online" — the customer then gets the leave-a-message path,
    // which is a worse experience than a live chat but better than a dead end.
    return [];
  }
}

export async function isAnyStaffOnline(): Promise<boolean> {
  return (await getOnlineStaff()).length > 0;
}
