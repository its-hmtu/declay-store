import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000),
  sessionId: z.number().int().positive().optional(),
});

export type ChatMessageRequest = z.infer<typeof chatMessageSchema>;

// ── M-42: live chat ──────────────────────────────────────────

export const sessionIdParamSchema = z.object({
  sessionId: z
    .string()
    .regex(/^\d+$/, 'Session ID must be a number')
    .transform(Number)
    .refine((v) => v > 0, 'Session ID must be positive'),
});

export const handoffRequestSchema = z.object({
  /** Free-text "what do you need help with" — optional, never block the ask. */
  reason: z.string().max(255).nullable().optional(),
  name: z.string().max(120).nullable().optional(),
  /** Where to reply if nobody is online. Optional by design — demanding it loses the lead. */
  email: z.string().email('Invalid email address').nullable().optional(),
});

export const liveMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000),
});
