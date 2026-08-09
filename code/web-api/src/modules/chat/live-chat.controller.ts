import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import { openSSE, sendSSE } from '@/lib/claude';
import { subscribeToSession, subscribeToInbox, markStaffOnline, markStaffOffline } from '@/lib/chat-bus';
import LiveChatService, { type ChatRequester, type ClaimActor } from './live-chat.service';

/** SSE connections idle for minutes get killed by proxies — a comment frame keeps them warm. */
const HEARTBEAT_MS = 25_000;

export default class LiveChatController {
  constructor(private service: LiveChatService) {}

  /**
   * A chat belongs either to a signed-in customer or to a guest browser session.
   * The guest id comes from the same header the cart already uses, so a visitor
   * who never signs in still has one stable identity across both features.
   */
  private requester(req: Request): ChatRequester {
    // Passport's own Express.User declaration wins over ours, so cast — same
    // pattern as chat.controller.ts.
    const user = req.user as { userId?: number } | undefined;
    if (user?.userId) return { userId: user.userId };
    const guestId = (req.header('x-guest-session') ?? '').trim();
    if (guestId.length >= 8 && guestId.length <= 64) return { guestSessionId: guestId };
    throw httpError(401, 'Sign in or provide a guest session to use chat');
  }

  /**
   * The admin JWT carries only id/email/role — no display name. Resolving it here
   * keeps the customer from seeing a staff member's email address in the chat.
   */
  private async actor(req: Request): Promise<ClaimActor> {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return this.service.resolveActor(req.admin.adminId, req.admin.role);
  }

  // ── Customer ────────────────────────────────────────────────

  requestHandoff = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.requestHandoff(
      Number(req.params.sessionId),
      this.requester(req),
      req.body,
    );
    sendSuccess(res, result, 'Handoff requested');
  });

  customerSend = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.service.customerSend(
      Number(req.params.sessionId),
      this.requester(req),
      req.body.message,
    );
    sendSuccess(res, message, 'Message sent', 201);
  });

  transcript = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await this.service.getTranscript(Number(req.params.sessionId), this.requester(req)),
      'Transcript retrieved',
    );
  });

  /** Live stream for the customer's own conversation. */
  customerStream = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = Number(req.params.sessionId);
    // Ownership is verified BEFORE the stream opens — otherwise any session id
    // would be a subscription to someone else's conversation.
    await this.service.getOwnedSession(sessionId, this.requester(req));
    this.stream(req, res, (onEvent) => subscribeToSession(sessionId, onEvent));
  });

  // ── Staff ───────────────────────────────────────────────────

  queue = asyncHandler(async (req: Request, res: Response) => {
    // Listing the queue is the reliable signal that a staff member is at their
    // desk — no separate "I'm online" button to forget to press.
    const actor = await this.actor(req);
    await markStaffOnline(actor.adminId, actor.name);
    sendSuccess(res, await this.service.listQueue(), 'Queue retrieved');
  });

  staffTranscript = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.staffTranscript(Number(req.params.sessionId)), 'Transcript retrieved');
  });

  claim = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.claim(Number(req.params.sessionId), await this.actor(req)), 'Conversation claimed');
  });

  staffSend = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.service.staffSend(
      Number(req.params.sessionId),
      await this.actor(req),
      req.body.message,
    );
    sendSuccess(res, message, 'Reply sent', 201);
  });

  close = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.close(Number(req.params.sessionId), await this.actor(req)), 'Conversation closed');
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    await this.service.markRead(Number(req.params.sessionId), await this.actor(req));
    sendSuccess(res, null, 'Marked as read');
  });

  heartbeat = asyncHandler(async (req: Request, res: Response) => {
    const actor = await this.actor(req);
    await markStaffOnline(actor.adminId, actor.name);
    sendSuccess(res, await this.service.onlineStaff(), 'Presence updated');
  });

  goOffline = asyncHandler(async (req: Request, res: Response) => {
    await markStaffOffline((await this.actor(req)).adminId);
    sendSuccess(res, null, 'Marked offline');
  });

  staffSessionStream = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = Number(req.params.sessionId);
    const actor = await this.actor(req);
    await markStaffOnline(actor.adminId, actor.name);
    this.stream(req, res, (onEvent) => subscribeToSession(sessionId, onEvent));
  });

  /** Inbox-wide stream: new conversations arriving, without polling. */
  inboxStream = asyncHandler(async (req: Request, res: Response) => {
    const actor = await this.actor(req);
    await markStaffOnline(actor.adminId, actor.name);
    this.stream(req, res, (onEvent) => subscribeToInbox(onEvent));
  });

  // ── shared SSE plumbing ─────────────────────────────────────

  /**
   * Every subscription MUST be torn down on disconnect: each one holds its own
   * Redis connection, so a leak here exhausts the connection pool one abandoned
   * browser tab at a time.
   */
  private stream(
    req: Request,
    res: Response,
    subscribe: (onEvent: (event: unknown) => void) => () => void,
  ): void {
    openSSE(res);
    sendSSE(res, 'ready', {});

    const unsubscribe = subscribe((event) => sendSSE(res, 'update', event));
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), HEARTBEAT_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  }
}
