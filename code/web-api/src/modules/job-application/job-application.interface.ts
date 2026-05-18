import type { RequestHandler } from 'express';
import type { ApplicationStatus } from './job-application.entity';

export interface IJobApplication {
  id: number;
  jobId: number;
  applicantName: string;
  email: string;
  cvUrl: string | null;
  coverLetter: string | null;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubmitApplicationData {
  jobId: number;
  applicantName: string;
  email: string;
  cvUrl?: string | null;
  coverLetter?: string | null;
}

export interface IJobApplicationService {
  submit(data: ISubmitApplicationData): Promise<IJobApplication>;
  listByJob(jobId: number): Promise<IJobApplication[]>;
  findById(id: number): Promise<IJobApplication>;
  updateStatus(id: number, status: ApplicationStatus): Promise<IJobApplication>;
}

export interface IJobApplicationController {
  submit: RequestHandler;
  listByJob: RequestHandler;
  findById: RequestHandler;
  updateStatus: RequestHandler;
}
