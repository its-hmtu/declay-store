import { randomUUID } from 'node:crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import config from '@/config/env';
import { getClaude, sendSSE } from '@/lib/claude';
import { redisOperations } from '@/lib/redis';
import { ChatSession, ChatMessage } from '@/modules/chat/chat.entity';
import { httpError } from '@/utils/http-error';
import { ADMIN_TOOLS, ADMIN_TOOL_DEFINITIONS } from './assistant.tools';
import { recordAudit } from '@/lib/audit';
import type { IAssistantService, IAssistantMessageInput } from './assistant.interface';

const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY = 20;
const PENDING_TTL = 600; // 10 minutes
const PENDING_PREFIX = 'assistant:pending:';

const SYSTEM_PROMPT = `You are the AI Assistant for the Declay Store admin dashboard. Declay Store sells handmade figures.

You help admins manage the store via tools:
- Catalogue: search/create/update products, create categories
- Orders: look up orders, list by status, change order status
- Content: list and publish articles
- Marketing: create discount codes and storefront banners

Rules:
- Always use tools for live data and for taking actions — never fabricate IDs, prices, or statuses.
- When creating a product by category name and that category does not exist, ask the admin if they want to create the category instead of asking whether it already exists.
- Destructive actions (changing order status, publishing an article, deleting a product) require admin confirmation. The system enforces this: when you call such a tool, it will pause and ask the admin to approve before it runs. Call the tool as normal; do not ask for confirmation yourself in text.
- Be precise and concise. Confirm what you did, referencing the affected IDs.`;

interface PendingState {
  adminId: number;
  sessionId: number;
  messages: Anthropic.MessageParam[];
  toolUses: Array<{ id: string; name: string; input: unknown }>;
  accText: string;
  accToolCalls: unknown[];
}

export default class AssistantService implements IAssistantService {
  private async safeExecute(name: string, input: unknown, adminId: number): Promise<string> {
    const tool = ADMIN_TOOLS[name];
    if (!tool) return `Error: unknown tool ${name}`;
    try {
      const result = await tool.execute(input, { adminId });
      void recordAudit({
        actorType: 'ai_assistant',
        actorId: adminId,
        action: name,
        source: 'ai_assistant',
        status: 'success',
        metadata: { input },
      });
      return JSON.stringify(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      void recordAudit({
        actorType: 'ai_assistant',
        actorId: adminId,
        action: name,
        source: 'ai_assistant',
        status: 'error',
        metadata: { input, error: message },
      });
      return `Error: ${message}`;
    }
  }

  private async loadHistory(sessionId: number): Promise<Anthropic.MessageParam[]> {
    const rows = await ChatMessage.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
      limit: MAX_HISTORY,
    });
    return rows.map((m) => ({ role: m.role, content: m.content }));
  }

  private async persistAssistant(sessionId: number, text: string, toolCalls: unknown[]): Promise<void> {
    await ChatMessage.create({
      sessionId,
      role: 'assistant',
      content: text,
      toolCalls: toolCalls.length ? toolCalls : null,
    });
  }

  /**
   * Runs the stream → tool loop until the model finishes (end_turn) or a
   * destructive tool is requested, at which point it pauses for confirmation.
   */
  private async runLoop(
    res: Response,
    state: PendingState,
    adminId: number,
  ): Promise<void> {
    const claude = getClaude();
    let aborted = false;
    res.on('close', () => { aborted = true; });

    for (let round = 0; round < MAX_TOOL_ROUNDS && !aborted; round++) {
      const stream = claude.messages.stream({
        model: config.anthropic.adminModel,
        max_tokens: 2048,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: ADMIN_TOOL_DEFINITIONS,
        messages: state.messages,
      });

      stream.on('text', (delta) => {
        state.accText += delta;
        sendSSE(res, 'delta', { text: delta });
      });

      const final = await stream.finalMessage();
      state.messages.push({ role: 'assistant', content: final.content });

      if (final.stop_reason !== 'tool_use') {
        await this.persistAssistant(state.sessionId, state.accText, state.accToolCalls);
        return;
      }

      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const hasDestructive = toolUses.some((b) => ADMIN_TOOLS[b.name]?.destructive);

      // A destructive tool anywhere in the turn pauses the whole turn — we can't
      // continue until every tool_use in it has a result, so confirm first.
      if (hasDestructive) {
        const pendingId = randomUUID();
        const pending: PendingState = {
          ...state,
          toolUses: toolUses.map((b) => ({ id: b.id, name: b.name, input: b.input })),
        };
        await redisOperations.set(`${PENDING_PREFIX}${pendingId}`, pending, PENDING_TTL);
        sendSSE(res, 'confirm', {
          pendingId,
          actions: toolUses.map((b) => ({
            name: b.name,
            input: b.input,
            destructive: !!ADMIN_TOOLS[b.name]?.destructive,
          })),
        });
        return;
      }

      // All non-destructive — execute and continue
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const b of toolUses) {
        state.accToolCalls.push({ name: b.name, input: b.input });
        sendSSE(res, 'tool', { name: b.name });
        const out = await this.safeExecute(b.name, b.input, adminId);
        toolResults.push({ type: 'tool_result', tool_use_id: b.id, content: out });
      }
      state.messages.push({ role: 'user', content: toolResults });
    }
  }

  async streamReply(res: Response, input: IAssistantMessageInput, adminId: number): Promise<void> {
    if (!config.anthropic.apiKey) throw httpError(503, 'Assistant is not configured');

    let session: ChatSession;
    if (input.sessionId) {
      const found = await ChatSession.findByPk(input.sessionId);
      if (!found || found.sessionType !== 'admin') throw httpError(404, 'Assistant session not found');
      session = found;
    } else {
      session = await ChatSession.create({ sessionType: 'admin', adminId });
    }

    sendSSE(res, 'session', { sessionId: session.id });

    const history = await this.loadHistory(session.id);
    await ChatMessage.create({ sessionId: session.id, role: 'user', content: input.message });

    const state: PendingState = {
      adminId,
      sessionId: session.id,
      messages: [...history, { role: 'user', content: input.message }],
      toolUses: [],
      accText: '',
      accToolCalls: [],
    };

    await this.runLoop(res, state, adminId);
  }

  async confirm(res: Response, pendingId: string, approved: boolean, adminId: number): Promise<void> {
    const key = `${PENDING_PREFIX}${pendingId}`;
    const pending = (await redisOperations.get(key)) as PendingState | null;
    if (!pending) throw httpError(404, 'No pending action found, or it has expired');
    if (pending.adminId !== adminId) throw httpError(403, 'This pending action belongs to another admin');
    await redisOperations.delete(key);

    sendSSE(res, 'session', { sessionId: pending.sessionId });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of pending.toolUses) {
      if (approved) {
        sendSSE(res, 'tool', { name: tu.name });
        const out = await this.safeExecute(tu.name, tu.input, adminId);
        pending.accToolCalls.push({ name: tu.name, input: tu.input });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'The admin cancelled this action.',
          is_error: true,
        });
      }
    }

    pending.messages.push({ role: 'user', content: toolResults });
    pending.toolUses = [];
    await this.runLoop(res, pending, adminId);
  }
}
