import type Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import config from '@/config/env';
import { getClaude, sendSSE } from '@/lib/claude';
import { ChatSession, ChatMessage } from './chat.entity';
import { botShouldReply } from './chat.handoff';
import { publishToSession } from '@/lib/chat-bus';
import ProductService from '@/modules/product/product.service';
import OrderService from '@/modules/order/order.service';
import PageService from '@/modules/page/page.service';
import { httpError } from '@/utils/http-error';
import type { IChatService, IChatMessageInput } from './chat.interface';

const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the customer support assistant for Declay Store, an e-commerce shop selling handmade figures.

You help customers with:
- Product questions (availability, price, variants, materials)
- Order status (only for signed-in customers)
- Shipping, returns, and general store policies

Policies & FAQ — FALLBACK ONLY.

M-43: the authoritative text lives in the shop's CMS and admins edit it without
touching this file. Call get_policy and answer from what it returns. Use the notes
below only to orient yourself, or if the tool fails. If the tool contradicts these
notes, the tool is right.

(These notes were themselves wrong until 2026-08-06 — they described a
Stripe/card-only shop with a 14-day return window, and the bot repeated that to
customers for months. That is the failure this tool exists to prevent.)
- Payment: Cash on Delivery (COD) is available on every order. VNPay online payment
  is offered where enabled. There is no international card checkout.
- Shipping: within Vietnam only, via GHN/GHTK. The fee is calculated at checkout
  from the delivery address — never quote a shipping price yourself.
- Returns/exchanges: within 7 days of delivery (BR-06). Say 7 days, not 14.
- Ordering does not require an account — guest checkout is supported.
- All figures are handmade, so slight variations between pieces are normal.

Rules:
- You are READ-ONLY. You cannot place orders, change orders, or modify any data.
- Use the search_products tool to answer product questions with live data; never invent prices or stock.
- Call get_policy before answering ANY question about shipping, returns, payment,
  privacy or terms. Quote the live page, then link to it.
- Order tools work only for signed-in customers. If a guest asks about an order,
  ask them to sign in, or offer to connect them with a member of the team.
- Prefer list_my_orders when the customer does not quote an order number — most
  people do not know their numeric order id.
- If the customer is frustrated, asks for a person, or the question needs an action
  you cannot take (cancelling, changing an address, a complaint), tell them you can
  connect them with the team and stop guessing.
- Be warm, concise, and helpful. If you don't know, say so.`;

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
  {
    /**
     * M-43: policy text lives in the `pages` CMS table, which admins edit from the
     * dashboard. Keeping a second copy in this prompt is how the bot ended up
     * telling customers about Stripe and a 14-day return window months after both
     * had changed. Read the live page instead of trusting the prompt.
     */
    name: 'get_policy',
    description:
      'Read the shop\'s current published policy text (shipping, returns, payment, privacy, terms). '
      + 'ALWAYS call this before answering a policy question — the summary in your instructions may be out of date.',
    input_schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: "Which page to read: 'policies' (shipping/returns/payment) or 'terms'.",
          enum: ['policies', 'terms'],
        },
      },
      required: ['slug'],
    },
  },
  {
    // M-42: customers ask "where is my order?", not "what is the status of order 4172".
    // Without this the bot had to demand an id nobody remembers, and gave up.
    name: 'list_my_orders',
    description:
      "List the signed-in customer's most recent orders with status, order code, total and date. "
      + 'Use this when they ask about "my order" without giving a number. Signed-in customers only.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many recent orders to return (max 5)' },
      },
    },
  },
];

/** Same length bounds the cart uses for a guest session id (M-01). */
function normaliseGuestId(value?: string | null): string | null {
  const id = (value ?? '').trim();
  return id.length >= 8 && id.length <= 64 ? id : null;
}

export default class ChatService implements IChatService {
  private productService = new ProductService();
  private orderService = new OrderService();
  private pageService = new PageService();

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
      if (name === 'get_policy') {
        const slug = input.slug === 'terms' ? 'terms' : 'policies';
        const page = await this.pageService.getPublicBySlug(slug);
        // Long legal pages would eat the context window; the bot needs the gist,
        // and the "read the full page" link covers the rest.
        return JSON.stringify({
          title: page.title,
          effectiveDate: page.effectiveDate,
          body: page.body.slice(0, 4000),
          url: `/${slug}`,
        });
      }
      if (name === 'list_my_orders') {
        if (!userId) {
          return 'The customer is not signed in. Ask them to sign in, or offer to connect them with the team.';
        }
        // Scoped by userId inside the service — the model cannot widen this.
        const limit = Math.min(Math.max(Number(input.limit) || 3, 1), 5);
        const { rows } = await this.orderService.listByUser(userId, 1, limit);
        if (!rows.length) return JSON.stringify({ orders: [], note: 'This customer has no orders yet.' });
        return JSON.stringify({
          orders: rows.map((o) => ({
            id: o.id,
            orderCode: o.orderCode,
            status: o.status,
            totalAmount: o.totalAmount,
            placedAt: o.createdAt,
          })),
        });
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

    /**
     * M-42: the transcript can now contain 'staff' and 'system' rows, which the
     * Messages API does not accept. Staff replies are folded in as assistant turns
     * (from the customer's point of view it was all "the shop" talking); system
     * markers are dropped. Without this the whole chat 400s the moment a
     * conversation has been through a handoff.
     */
    return rows
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }))
      // The API rejects an empty content block, and staff can send whitespace.
      .filter((m) => m.content.trim().length > 0);
  }

  async streamReply(
    res: Response,
    input: IChatMessageInput,
    userId: number | null,
    guestSessionId?: string | null,
  ): Promise<void> {
    if (!config.anthropic.apiKey) throw httpError(503, 'Chat is not configured');

    const guestId = normaliseGuestId(guestSessionId);

    // Resolve or create the session
    let session: ChatSession;
    if (input.sessionId) {
      const found = await ChatSession.findByPk(input.sessionId);
      if (!found || found.sessionType !== 'storefront') throw httpError(404, 'Chat session not found');

      /**
       * M-42: a session id alone must not grant access to somebody else's chat —
       * transcripts contain order details. Sessions created before this check
       * carry neither owner, so they stay open to their creator by falling through.
       */
      const owned =
        (found.userId != null && found.userId === userId)
        || (found.guestSessionId != null && found.guestSessionId === guestId)
        || (found.userId == null && found.guestSessionId == null);
      if (!owned) throw httpError(403, 'This conversation belongs to someone else');

      // A guest who signs in mid-conversation keeps their history.
      if (userId && found.userId == null) await found.update({ userId });
      if (!found.guestSessionId && guestId) await found.update({ guestSessionId: guestId });

      session = found;
    } else {
      session = await ChatSession.create({
        sessionType: 'storefront',
        userId: userId ?? null,
        guestSessionId: userId ? null : guestId,
      });
    }

    sendSSE(res, 'session', { sessionId: session.id, mode: session.mode });

    /**
     * M-42: once a human owns the conversation the bot goes quiet. Two voices
     * answering the same customer is worse than a short silence — and a staff
     * member should never have to argue with the assistant in their own thread.
     * The message is still persisted and pushed to the staff inbox.
     */
    if (!botShouldReply(session.mode)) {
      const message = await ChatMessage.create({
        sessionId: session.id,
        role: 'user',
        content: input.message,
      });
      await session.update({ lastMessageAt: message.createdAt });
      await publishToSession(session.id, {
        type: 'message',
        sessionId: session.id,
        message: {
          id: message.id,
          role: 'user',
          content: message.content,
          authorName: null,
          createdAt: message.createdAt.toISOString(),
        },
      });
      sendSSE(res, 'handoff', { mode: session.mode });
      return;
    }

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
