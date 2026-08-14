import { z } from 'zod';

export const assistantMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(8000),
  sessionId: z.number().int().positive().optional(),
});

export const confirmActionSchema = z.object({
  pendingId: z.string().min(1, 'pendingId is required'),
  approved: z.boolean(),
});

export type AssistantMessageRequest = z.infer<typeof assistantMessageSchema>;
export type ConfirmActionRequest = z.infer<typeof confirmActionSchema>;
