import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { openSSE, sendSSE, closeSSE } from '@/lib/claude';
import { httpError } from '@/utils/http-error';
import type { IAssistantController, IAssistantService } from './assistant.interface';

export default class AssistantController implements IAssistantController {
  constructor(private assistantService: IAssistantService) {}

  private getAdminId(req: Request): number {
    if (!req.admin?.adminId) throw httpError(401, 'Not authenticated');
    return req.admin.adminId;
  }

  message = asyncHandler(async (req: Request, res: Response) => {
    const adminId = this.getAdminId(req);
    openSSE(res);
    try {
      await this.assistantService.streamReply(res, req.body, adminId);
      closeSSE(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assistant failed';
      sendSSE(res, 'error', { message });
      res.end();
    }
  });

  confirm = asyncHandler(async (req: Request, res: Response) => {
    const adminId = this.getAdminId(req);
    const { pendingId, approved } = req.body;
    openSSE(res);
    try {
      await this.assistantService.confirm(res, pendingId, approved, adminId);
      closeSSE(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assistant failed';
      sendSSE(res, 'error', { message });
      res.end();
    }
  });
}
