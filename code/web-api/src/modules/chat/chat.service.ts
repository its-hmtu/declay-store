import type Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import config from '@/config/env';
import { getClaude, sendSSE } from '@/lib/claude';
import { ChatSession, ChatMessage } from './chat.entity';
import ProductService from '@/modules/product/product.service';
import OrderService from '@/modules/order/order.service';
import { httpError } from '@/utils/http-error';
import type { IChatService, IChatMessageInput } from './chat.interface';

const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the customer support assistant for Declay Store, an e-commerce shop selling handmade figures.

You help customers with:
- Product questions (availability, price, variants, materials)
- Order status (only for signed-in customers)
- Shipping, returns, and general store policies

Policies & FAQ:
- Shipping: orders ship within 2-3 business days; delivery 5-10 business days.
- Returns: unopened items may be returned within 14 days of delivery.
- Payment: card payments only, processed securely via Stripe.
- All figures are handmade, so slight variations between pieces are normal.

Rules:
- You are READ-ONLY. You cannot place orders, change orders, or modify any data.
- Use the search_products tool to answer product questions with live data; never invent prices or stock.
- Only call get_order_status for a signed-in customer; if a guest asks about an order, ask them to sign in.
- Be warm, concise, and helpful. If you don't know, say so and suggest contacting support.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Search the live product catalogue by keyword. Returns matching products with their variants, prices, and stock.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords, e.g. "dragon figure"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_order_status',
    description: "Look up the status of the signed-in customer's order by its numeric ID. Only works for signed-in customers.",
    input_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'number', description: 'The numeric order ID' },
      },
      required: ['orderId'],
    },
  },
];

export default class ChatService implements IChatService {
  private productService = new ProductService();
  private orderService = new OrderService();

  private async executeTool(name: string, input: any, userId: number | null): Promise<string> {
    try {
      if (name === 'search_products') {
        const result = await this.productService.list({ search: String(input.query ?? ''), limit: 10, page: 1 });
        return JSON.stringify(result.rows);
      }
      if (name === 'get_order_status') {
        if (!userId) return 'The customer is not signed in. Ask them to sign in to check order status.';
        const order = await this.orderService.findById(Number(input.orderId), userId);
        return JSON.stringify({ id: order.id, status: order.status, totalAmount: order.totalAmount });
      }
      return `Unknown tool: ${name}`;
    } catch (err) {
      // Surface a tool-level error back to the model rather than crashing the stream
      const message = err instanceof Error ? err.message : 'Tool execution failed';
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

  async streamReply(res: Response, input: IChatMessageInput, userId: number | null): Promise<void> {
    if (!config.anthropic.apiKey) throw httpError(503, 'Chat is not configured');

    // Resolve or create the session
    let session: ChatSession;
    if (input.sessionId) {
      const found = await ChatSession.findByPk(input.sessionId);
      if (!found || found.sessionType !== 'storefront') throw httpError(404, 'Chat session not found');
      session = found;
    } else {
      session = await ChatSession.create({ sessionType: 'storefront', userId: userId ?? null });
    }

    sendSSE(res, 'session', { sessionId: session.id });

    const history = await this.loadHistory(session.id);
    const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: input.message }];

    const claude = getClaude();
    let assistantText = '';
    const toolCalls: unknown[] = [];
    let aborted = false;
    res.on('close', () => { aborted = true; });

    for (let round = 0; round < MAX_TOOL_ROUNDS && !aborted; round++) {
      const stream = claude.messages.stream({
        model: config.anthropic.storefrontModel,
        max_tokens: 1024,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
      });

      stream.on('text', (delta) => {
        assistantText += delta;
        sendSSE(res, 'delta', { text: delta });
      });

      const final = await stream.finalMessage();
      messages.push({ role: 'assistant', content: final.content });

      if (final.stop_reason !== 'tool_use') break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue;
        toolCalls.push({ name: block.name, input: block.input });
        sendSSE(res, 'tool', { name: block.name });
        const result = await this.executeTool(block.name, block.input, userId);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });

        // If the tool returned product search results (JSON array), emit
        // an `actions` SSE event offering quick-choice buttons to the user.
        try {
          const parsed = JSON.parse(result);
          if (block.name === 'search_products' && Array.isArray(parsed) && parsed.length) {
            const actions = (parsed as any[]).slice(0, 5).map((p) => ({
              label: `${p.name} — ${p.variants?.[0]?.price ?? ''}`.trim(),
              // payload can be used by the client to navigate or send structured follow-up
              payload: { type: 'view_product', productId: p.id, label: p.name },
            }));
            sendSSE(res, 'actions', { actions });
          }
        } catch (e) {
          // ignore non-JSON results
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    // Persist the turn (skip if the client bailed before we produced anything)
    if (!aborted) {
      await ChatMessage.create({ sessionId: session.id, role: 'user', content: input.message });
      await ChatMessage.create({
        sessionId: session.id,
        role: 'assistant',
        content: assistantText,
        toolCalls: toolCalls.length ? toolCalls : null,
      });
    }
  }
}
