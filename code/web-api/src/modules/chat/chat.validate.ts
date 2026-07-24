import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000),
  sessionId: z.number().int().positive().optional(),
});

export type ChatMessageRequest = z.infer<typeof chatMessageSchema>;
