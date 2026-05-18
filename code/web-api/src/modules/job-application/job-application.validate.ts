import { z } from 'zod';

export const submitApplicationSchema = z.object({
  applicantName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  cvUrl: z.string().url('CV must be a valid URL').nullable().optional(),
  coverLetter: z.string().max(3000).nullable().optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['received', 'reviewing', 'interview', 'hired', 'rejected']),
});

export const applicationIdSchema = z.object({
  applicationId: z
    .string()
    .regex(/^\d+$/, 'Application ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export const jobIdParamSchema = z.object({
  jobId: z
    .string()
    .regex(/^\d+$/, 'Job ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type SubmitApplicationRequest = z.infer<typeof submitApplicationSchema>;
export type UpdateApplicationStatusRequest = z.infer<typeof updateApplicationStatusSchema>;
