import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import type { IJobController, IJobService } from './job.interface';

export default class JobController implements IJobController {
  constructor(private jobService: IJobService) {}

  listOpen = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await this.jobService.listOpen();
    sendSuccess(res, jobs, 'Open positions retrieved successfully');
  });

  listAll = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await this.jobService.listAll();
    sendSuccess(res, jobs, 'Jobs retrieved successfully');
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const job = await this.jobService.findById(Number(req.params.id));
    sendSuccess(res, job, 'Job retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const job = await this.jobService.create(req.body);
    sendSuccess(res, job, 'Job created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const job = await this.jobService.update(Number(req.params.id), req.body);
    sendSuccess(res, job, 'Job updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.jobService.delete(Number(req.params.id));
    sendSuccess(res, null, 'Job deleted successfully');
  });
}
