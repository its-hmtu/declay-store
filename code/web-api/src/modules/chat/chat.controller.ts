import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { openSSE, sendSSE, closeSSE } from '@/lib/claude';
import { httpError } from '@/utils/http-error';
import type { IChatController, IChatService } from './chat.interface';

export default class ChatController implements IChatController {
  constructor(private chatService: IChatService) {}

  message = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as { userId?: number } | undefined;
    const userId = user?.userId ?? null;

    openSSE(res);
    try {
      await this.chatService.streamReply(res, req.body, userId);
      closeSSE(res);
    } catch (err) {
      // Headers are already sent, so report the error inside the stream
      const message = err instanceof Error ? err.message : 'Chat failed';
      sendSSE(res, 'error', { message });
      res.end();
    }
  });
}
