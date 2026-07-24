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
  ): Promise<void>;
}

export interface IChatController {
  message: RequestHandler;
}
