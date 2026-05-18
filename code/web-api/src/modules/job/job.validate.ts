import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().nullable().optional(),
  location: z.string().max(255).nullable().optional(),
});

export const updateJobSchema = z
  .object({
    title: z.string().min(3).max(255).optional(),
    description: z.string().min(20).optional(),
    requirements: z.string().nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    isOpen: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const jobIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Job ID must be a number')
    .transform(Number)
    .refine((val) => val > 0),
});

export type CreateJobRequest = z.infer<typeof createJobSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobSchema>;
