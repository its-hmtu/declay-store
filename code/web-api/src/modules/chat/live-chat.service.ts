/**
 * M-42: customer ↔ staff live chat, layered on the existing AI chat session.
 *
 * The escalation keeps the SAME `chat_sessions` row the bot was using, so the
 * staff member opens the conversation and reads everything the customer already
 * said. Making them repeat themselves is the thing this feature exists to avoid.
 */
import { Op } from 'sequelize';
import { ChatSession, ChatMessage, type ChatMode } from './chat.entity';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';
import { httpError } from '@/utils/http-error';
import { logger } from '@/lib/logger';
import {
  publishToSession, publishToInbox, isAnyStaffOnline, getOnlineStaff,
  type PublishedMessage,
} from '@/lib/chat-bus';
import {
  transitionError, staffCanSend, customerCanSend, sortQueue, handoffAcknowledgement,
} from './chat.handoff';
import { sendHandoffNotification } from '@/lib/chat-email';

/** Who is asking — a signed-in customer or an anonymous browser session. */
export type ChatRequester = { userId: number } | { guestSessionId: string };

export interface ClaimActor {
  adminId: number;
  name: string;
  role?: string | null;
}

export default class LiveChatService {
  /**
   * Resolve the staff display name. The admin JWT only carries id/email/role, and
   * showing a customer "sales@declay.store joined the conversation" is worse than
   * one extra query — fall back to a neutral label rather than leaking the email.
   */
  async resolveActor(adminId: number, role?: string | null): Promise<ClaimActor> {
    const admin = await AdminUser.findByPk(adminId, { attributes: ['fullName'] });
    return { adminId, name: admin?.fullName?.trim() || 'Support', role: role ?? null };
  }

  // ── Customer side ───────────────────────────────────────────

  /**
   * Load a session and prove the caller owns it. Chat transcripts contain order
   * details and personal questions, so ownership is checked on every read — a
   * numeric session id must not be enough to read someone else's conversation.
   */
  async getOwnedSession(sessionId: number, requester: ChatRequester): Promise<ChatSession> {
    const session = await ChatSession.findByPk(sessionId);
    if (!session || session.sessionType !== 'storefront') throw httpError(404, 'Chat session not found');

    const ownsAsUser = 'userId' in requester && session.userId === requester.userId;
    const ownsAsGuest = 'guestSessionId' in requester && session.guestSessionId === requester.guestSessionId;
    if (!ownsAsUser && !ownsAsGuest) throw httpError(403, 'This conversation belongs to someone else');

    return session;
  }

  /** Escalate to a human. Idempotent: asking twice while queued is not an error. */
  async requestHandoff(
    sessionId: number,
    requester: ChatRequester,
    input: { reason?: string | null; name?: string | null; email?: string | null },
  ): Promise<{ mode: ChatMode; acknowledgement: string; staffOnline: boolean }> {
    const session = await this.getOwnedSession(sessionId, requester);

    const staffOnline = await isAnyStaffOnline();
    const email = input.email?.trim() || session.guestEmail;

    if (session.mode === 'waiting' || session.mode === 'live') {
      return {
        mode: session.mode,
        acknowledgement: handoffAcknowledgement(staffOnline, !!email),
        staffOnline,
      };
    }

    const error = transitionError(session.mode, 'waiting');
    if (error) throw httpError(409, error);

    await session.update({
      mode: 'waiting',
      handoffReason: input.reason?.slice(0, 255) ?? null,
      handoffRequestedAt: new Date(),
      guestName: input.name?.slice(0, 120) ?? session.guestName,
      guestEmail: email ?? null,
    });

    const acknowledgement = handoffAcknowledgement(staffOnline, !!email);
    await this.appendSystemMessage(session, acknowledgement);

    await publishToInbox({ type: 'queued', sessionId: session.id, at: new Date().toISOString() });
    await publishToSession(session.id, { type: 'mode', sessionId: session.id, mode: 'waiting' });

    // Nobody watching the inbox → fall back to email so the lead is not lost.
    if (!staffOnline) {
      sendHandoffNotification(session).catch((err) =>
        logger.warn('handoff notification failed', { sessionId: session.id, error: String(err) }),
      );
    }

    return { mode: 'waiting', acknowledgement, staffOnline };
  }

  /** Customer message while queued or live. Bot replies are handled elsewhere. */
  async customerSend(sessionId: number, requester: ChatRequester, content: string): Promise<PublishedMessage> {
    const session = await this.getOwnedSession(sessionId, requester);
    if (!customerCanSend(session.mode)) throw httpError(409, 'This conversation is closed. Start a new chat.');

    const message = await this.append(session, { role: 'user', content });

    // Waiting conversations move up the inbox when the customer adds detail.
    await publishToInbox({ type: 'activity', sessionId: session.id, at: new Date().toISOString() });
    return message;
  }

  async getTranscript(sessionId: number, requester: ChatRequester): Promise<{
    session: { id: number; mode: ChatMode; staffName: string | null };
    messages: PublishedMessage[];
  }> {
    const session = await this.getOwnedSession(sessionId, requester);
    return {
      session: {
        id: session.id,
        mode: session.mode,
        staffName: await this.assignedName(session),
      },
      messages: await this.loadMessages(session.id),
    };
  }

  // ── Staff side ──────────────────────────────────────────────

  /** Inbox: waiting first, oldest first. Closed conversations are excluded. */
  async listQueue(): Promise<Array<Record<string, unknown>>> {
    const rows = await ChatSession.findAll({
      where: { sessionType: 'storefront', mode: { [Op.in]: ['waiting', 'live'] } },
      include: [{ model: AdminUser, as: 'assignedAdmin', attributes: ['id', 'fullName'], required: false }],
      limit: 100,
    });

    const sorted = sortQueue(
      rows.map((r) => ({
        id: r.id,
        mode: r.mode,
        handoffRequestedAt: r.handoffRequestedAt,
        row: r,
      })),
    );

    return sorted.map(({ row }) => ({
      id: row.id,
      mode: row.mode,
      reason: row.handoffReason,
      customerName: row.guestName,
      customerEmail: row.guestEmail,
      userId: row.userId,
      isGuest: row.userId == null,
      assignedAdminId: row.assignedAdminId,
      assignedAdminName: (row as unknown as { assignedAdmin?: { fullName?: string } }).assignedAdmin?.fullName ?? null,
      handoffRequestedAt: row.handoffRequestedAt,
      lastMessageAt: row.lastMessageAt,
      // Unread = customer wrote after the assignee last opened it.
      hasUnread: !!row.lastMessageAt && (!row.staffLastReadAt || row.lastMessageAt > row.staffLastReadAt),
      waitingSeconds: row.handoffRequestedAt
        ? Math.max(0, Math.round((Date.now() - new Date(row.handoffRequestedAt).getTime()) / 1000))
        : null,
    }));
  }

  /** Take ownership. Loses the race gracefully if a colleague claimed it first. */
  async claim(sessionId: number, actor: ClaimActor): Promise<{ mode: ChatMode }> {
    const session = await ChatSession.findByPk(sessionId);
    if (!session) throw httpError(404, 'Chat session not found');

    if (session.mode === 'live' && session.assignedAdminId !== actor.adminId && actor.role !== 'super_admin') {
      throw httpError(409, 'Another staff member already claimed this conversation');
    }

    const error = transitionError(session.mode, 'live');
    if (error) throw httpError(409, error);

    await session.update({
      mode: 'live',
      assignedAdminId: actor.adminId,
      claimedAt: session.claimedAt ?? new Date(),
      staffLastReadAt: new Date(),
    });

    await this.appendSystemMessage(session, `${actor.name} joined the conversation.`);
    await publishToSession(session.id, {
      type: 'mode', sessionId: session.id, mode: 'live', staffName: actor.name,
    });
    await publishToInbox({ type: 'claimed', sessionId: session.id, adminId: actor.adminId });

    return { mode: 'live' };
  }

  async staffSend(sessionId: number, actor: ClaimActor, content: string): Promise<PublishedMessage> {
    const session = await ChatSession.findByPk(sessionId);
    if (!session) throw httpError(404, 'Chat session not found');

    const check = staffCanSend(session.mode, session.assignedAdminId ?? null, actor.adminId, actor.role);
    if (!check.allowed) throw httpError(409, check.reason ?? 'Cannot reply to this conversation');

    const message = await this.append(session, {
      role: 'staff',
      content,
      adminId: actor.adminId,
      authorName: actor.name,
    });
    await session.update({ staffLastReadAt: new Date() });
    return message;
  }

  async close(sessionId: number, actor: ClaimActor): Promise<{ mode: ChatMode }> {
    const session = await ChatSession.findByPk(sessionId);
    if (!session) throw httpError(404, 'Chat session not found');
    if (session.mode === 'closed') return { mode: 'closed' };

    const error = transitionError(session.mode, 'closed');
    if (error) throw httpError(409, error);

    await session.update({ mode: 'closed', closedAt: new Date() });
    await this.appendSystemMessage(session, 'Conversation closed. Start a new chat if you need anything else.');
    await publishToSession(session.id, { type: 'mode', sessionId: session.id, mode: 'closed' });
    await publishToInbox({ type: 'closed', sessionId: session.id });

    return { mode: 'closed' };
  }

  async markRead(sessionId: number, actor: ClaimActor): Promise<void> {
    const session = await ChatSession.findByPk(sessionId);
    if (!session) throw httpError(404, 'Chat session not found');
    if (session.assignedAdminId != null && session.assignedAdminId !== actor.adminId && actor.role !== 'super_admin') {
      return; // reading someone else's conversation must not clear THEIR unread badge
    }
    await session.update({ staffLastReadAt: new Date() });
  }

  /** Staff transcript — no ownership check; any staff may read before claiming. */
  async staffTranscript(sessionId: number): Promise<{
    session: Record<string, unknown>;
    messages: PublishedMessage[];
  }> {
    const session = await ChatSession.findByPk(sessionId, {
      include: [{ model: AdminUser, as: 'assignedAdmin', attributes: ['id', 'fullName'], required: false }],
    });
    if (!session) throw httpError(404, 'Chat session not found');

    return {
      session: {
        id: session.id,
        mode: session.mode,
        reason: session.handoffReason,
        customerName: session.guestName,
        customerEmail: session.guestEmail,
        userId: session.userId,
        assignedAdminId: session.assignedAdminId,
        assignedAdminName: (session as unknown as { assignedAdmin?: { fullName?: string } }).assignedAdmin?.fullName ?? null,
        handoffRequestedAt: session.handoffRequestedAt,
      },
      messages: await this.loadMessages(session.id),
    };
  }

  async onlineStaff(): Promise<Array<{ adminId: number; name: string }>> {
    return getOnlineStaff();
  }

  // ── internals ───────────────────────────────────────────────

  private async append(
    session: ChatSession,
    data: { role: 'user' | 'staff' | 'system'; content: string; adminId?: number; authorName?: string },
  ): Promise<PublishedMessage> {
    const row = await ChatMessage.create({
      sessionId: session.id,
      role: data.role,
      content: data.content,
      adminId: data.adminId ?? null,
      authorName: data.authorName ?? null,
    });

    await session.update({ lastMessageAt: row.createdAt });

    const published: PublishedMessage = {
      id: row.id,
      role: row.role,
      content: row.content,
      authorName: row.authorName ?? null,
      createdAt: row.createdAt.toISOString(),
    };

    await publishToSession(session.id, { type: 'message', sessionId: session.id, message: published });
    return published;
  }

  private async appendSystemMessage(session: ChatSession, content: string): Promise<void> {
    await this.append(session, { role: 'system', content });
  }

  private async loadMessages(sessionId: number): Promise<PublishedMessage[]> {
    const rows = await ChatMessage.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
      limit: 200,
    });
    return rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      authorName: m.authorName ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  private async assignedName(session: ChatSession): Promise<string | null> {
    if (!session.assignedAdminId) return null;
    const admin = await AdminUser.findByPk(session.assignedAdminId, { attributes: ['fullName'] });
    return admin?.fullName ?? null;
  }
}
