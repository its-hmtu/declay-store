import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import CodService from './cod.service';

export default class CodController {
  constructor(private service: CodService) {}

  listPending = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listPending(), 'Pending COD payments retrieved successfully');
  });

  reconcile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.admin?.adminId;
    if (!adminId) throw httpError(401, 'Not authenticated');
    const { collectedAmount, note } = req.body;
    const { payment, result } = await this.service.reconcile(
      Number(req.params.id), Number(collectedAmount), adminId, note,
    );
    sendSuccess(res, { payment: payment.toJSON(), ...result }, `Cash reconciled (${result.outcome})`);
  });
}
