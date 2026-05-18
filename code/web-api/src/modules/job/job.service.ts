import Job from './job.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';
import type { IJob, IJobService, ICreateJobData, IUpdateJobData } from './job.interface';

export default class JobService implements IJobService {
  async listOpen(): Promise<IJob[]> {
    const jobs = await Job.findAll({ where: { isOpen: true }, order: [['createdAt', 'DESC']] });
    return jobs.map((j) => j.toJSON() as IJob);
  }

  async listAll(): Promise<IJob[]> {
    const jobs = await Job.findAll({ order: [['createdAt', 'DESC']] });
    return jobs.map((j) => j.toJSON() as IJob);
  }

  async findById(id: number): Promise<IJob> {
    const job = await Job.findByPk(id);
    if (!job) throw httpError(404, 'Job not found');
    return job.toJSON() as IJob;
  }

  async create(data: ICreateJobData): Promise<IJob> {
    const job = await Job.create(data);
    await invalidateCache(`${cacheKey.JOB_LIST}*`);
    return job.toJSON() as IJob;
  }

  async update(id: number, data: IUpdateJobData): Promise<IJob> {
    const job = await Job.findByPk(id);
    if (!job) throw httpError(404, 'Job not found');
    await job.update(data);
    await invalidateCache(`${cacheKey.JOB_LIST}*`);
    await invalidateCache(`${cacheKey.JOB_DETAIL}:${id}`);
    return job.toJSON() as IJob;
  }

  async delete(id: number): Promise<void> {
    const job = await Job.findByPk(id);
    if (!job) throw httpError(404, 'Job not found');
    await job.destroy();
    await invalidateCache(`${cacheKey.JOB_LIST}*`);
    await invalidateCache(`${cacheKey.JOB_DETAIL}:${id}`);
  }
}
