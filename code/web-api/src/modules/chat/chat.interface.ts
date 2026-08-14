import type { RequestHandler } from 'express';

export interface IChatMessageInput {
  message: string;
  sessionId?: number;
}

export interface IChatService {
  // Streams the assistant reply over SSE; returns nothing (writes to res)
  streamReply(
    res: import('express').Response,
    input: IChatMessageInput,
    userId: number | null,
    /**
     * M-42: recorded on the session so a guest can later escalate to a human.
     * Without it the handoff ownership check has nothing to match against and a
     * guest could never reach staff — which would contradict guest checkout.
     */
    guestSessionId?: string | null,
  ): Promise<void>;
}

export interface IChatController {
  message: RequestHandler;
}
