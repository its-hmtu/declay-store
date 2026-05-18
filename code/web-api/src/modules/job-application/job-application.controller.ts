import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import type { IJobApplicationController, IJobApplicationService } from './job-application.interface';

export default class JobApplicationController implements IJobApplicationController {
  constructor(private applicationService: IJobApplicationService) {}

  submit = asyncHandler(async (req: Request, res: Response) => {
    const application = await this.applicationService.submit({
      ...req.body,
      jobId: Number(req.params.jobId),
    });
    sendSuccess(res, application, 'Application submitted successfully', 201);
  });

  listByJob = asyncHandler(async (req: Request, res: Response) => {
    const applications = await this.applicationService.listByJob(Number(req.params.jobId));
    sendSuccess(res, applications, 'Applications retrieved successfully');
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const application = await this.applicationService.findById(Number(req.params.applicationId));
    sendSuccess(res, application, 'Application retrieved successfully');
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const application = await this.applicationService.updateStatus(
      Number(req.params.applicationId),
      req.body.status,
    );
    sendSuccess(res, application, 'Application status updated');
  });
}
