import type { RequestHandler } from 'express';
import type { Response } from 'express';

export interface IAssistantMessageInput {
  message: string;
  sessionId?: number;
}

export interface IAssistantService {
  streamReply(res: Response, input: IAssistantMessageInput, adminId: number): Promise<void>;
  confirm(res: Response, pendingId: string, approved: boolean, adminId: number): Promise<void>;
}

export interface IAssistantController {
  message: RequestHandler;
  confirm: RequestHandler;
}
