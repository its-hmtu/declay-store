import type { RequestHandler } from 'express';

export interface IJob {
  id: number;
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateJobData {
  title: string;
  description: string;
  requirements?: string | null;
  location?: string | null;
}

export interface IUpdateJobData {
  title?: string;
  description?: string;
  requirements?: string | null;
  location?: string | null;
  isOpen?: boolean;
}

export interface IJobService {
  listOpen(): Promise<IJob[]>;
  listAll(): Promise<IJob[]>;
  findById(id: number): Promise<IJob>;
  create(data: ICreateJobData): Promise<IJob>;
  update(id: number, data: IUpdateJobData): Promise<IJob>;
  delete(id: number): Promise<void>;
}

export interface IJobController {
  listOpen: RequestHandler;
  listAll: RequestHandler;
  findById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}
