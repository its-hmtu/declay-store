import JobApplication, { type ApplicationStatus } from './job-application.entity';
import Job from '@/modules/job/job.entity';
import { httpError } from '@/utils/http-error';
import type { IJobApplication, IJobApplicationService, ISubmitApplicationData } from './job-application.interface';

export default class JobApplicationService implements IJobApplicationService {
  async submit(data: ISubmitApplicationData): Promise<IJobApplication> {
    const job = await Job.findByPk(data.jobId);
    if (!job) throw httpError(404, 'Job not found');
    if (!job.isOpen) throw httpError(400, 'This position is no longer accepting applications');

    const application = await JobApplication.create(data);
    return application.toJSON() as IJobApplication;
  }

  async listByJob(jobId: number): Promise<IJobApplication[]> {
    const job = await Job.findByPk(jobId);
    if (!job) throw httpError(404, 'Job not found');

    const applications = await JobApplication.findAll({
      where: { jobId },
      order: [['createdAt', 'DESC']],
    });
    return applications.map((a) => a.toJSON() as IJobApplication);
  }

  async findById(id: number): Promise<IJobApplication> {
    const application = await JobApplication.findByPk(id, {
      include: [{ model: Job, as: 'job', attributes: ['id', 'title'] }],
    });
    if (!application) throw httpError(404, 'Application not found');
    return application.toJSON() as IJobApplication;
  }

  async updateStatus(id: number, status: ApplicationStatus): Promise<IJobApplication> {
    const application = await JobApplication.findByPk(id);
    if (!application) throw httpError(404, 'Application not found');
    await application.update({ status });
    return application.toJSON() as IJobApplication;
  }
}
