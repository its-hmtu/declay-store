import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import config from '@/config/env';

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return client;
}

/**
 * Server-Sent Events helpers. Chat responses stream raw and therefore bypass
 * the standard sendSuccess/sendError envelope — this is the one deliberate
 * exception to that rule.
 */
export function openSSE(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering so deltas flush immediately
  });
}

export function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function closeSSE(res: Response): void {
  res.write('event: done\ndata: {}\n\n');
  res.end();
}
