import type Anthropic from '@anthropic-ai/sdk';
import ProductService from '@/modules/product/product.service';
import CategoryService from '@/modules/category/category.service';
import { httpError } from '@/utils/http-error';
import DiscountService from '@/modules/discount/discount.service';
import BannerService from '@/modules/banner/banner.service';
import ArticleService from '@/modules/article/article.service';
import OrderService from '@/modules/order/order.service';
import type { OrderStatus } from '@/modules/order/order.entity';

export interface ToolContext {
  adminId: number;
}

export interface AdminTool {
  definition: Anthropic.Tool;
  // Destructive tools require explicit admin confirmation before execution
  destructive: boolean;
  execute: (input: any, ctx: ToolContext) => Promise<unknown>;
}

const products = new ProductService();
const categories = new CategoryService();
const discounts = new DiscountService();
const banners = new BannerService();
const articles = new ArticleService();
const orders = new OrderService();
const DISCOUNT_MAX_USES_CAP = 10000;

const ORDER_STATUSES: OrderStatus[] = [
  'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled',
];

export const ADMIN_TOOLS: Record<string, AdminTool> = {
  // ── Reads ─────────────────────────────────────────────
  search_products: {
    destructive: false,
    definition: {
      name: 'search_products',
      description: 'Search the product catalogue by keyword.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
    execute: async (input) => {
      const result = await products.list({ search: String(input.query ?? ''), limit: 10, page: 1 });
      return result.rows;
    },
  },
  get_order: {
    destructive: false,
    definition: {
      name: 'get_order',
      description: 'Get a single order by numeric ID, including its items.',
      input_schema: {
        type: 'object',
        properties: { orderId: { type: 'number' } },
        required: ['orderId'],
      },
    },
    execute: async (input) => orders.findById(Number(input.orderId)),
  },
  list_orders: {
    destructive: false,
    definition: {
      name: 'list_orders',
      description: 'List recent orders, optionally filtered by status.',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ORDER_STATUSES },
          limit: { type: 'number', description: 'Max 50' },
        },
      },
    },
    execute: async (input) => {
      const limit = input.limit ? Math.min(Number(input.limit), 50) : 20;
      const result = await orders.listAll(1, limit, input.status as OrderStatus | undefined);
      return result.rows;
    },
  },
  list_articles: {
    destructive: false,
    definition: {
      name: 'list_articles',
      description: 'List all articles (published and drafts).',
      input_schema: { type: 'object', properties: {} },
    },
    execute: async () => articles.listAll(20, 0),
  },

  // ── Non-destructive writes (execute immediately) ──────
  create_product: {
    destructive: false,
    definition: {
      name: 'create_product',
      description: 'Create a new product (parent). Variants with price/stock are added separately.',
      input_schema: {
        type: 'object',
        properties: {
          // Accept either `categoryId` (numeric) or `categoryName` (string).
          // The tool will resolve the name to an ID. Prefer name for convenience.
          categoryId: { type: 'number' },
          categoryName: { type: 'string' },
          name: { type: 'string' },
          // `slug` is optional; if omitted it will be auto-generated from `name`.
          slug: { type: 'string', description: 'lowercase, hyphenated (optional)' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
    execute: async (input) => {
      // Resolve categoryId from categoryName if provided
      let categoryId: number | undefined = input.categoryId != null ? Number(input.categoryId) : undefined;
      if (!categoryId && input.categoryName) {
        const found = await categories.findByName(String(input.categoryName));
        if (found) categoryId = found.id;
        else throw httpError(404, `Category "${String(input.categoryName)}" was not found. Ask the admin whether they want to create it.`);
      }
      if (categoryId == null) {
        throw httpError(400, 'categoryId or categoryName is required for create_product');
      }

      // Generate slug from name if missing
      let slug = input.slug ? String(input.slug) : '';
      if (!slug && input.name) {
        slug = String(input.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      if (!slug) throw httpError(400, 'Unable to generate slug from name; provide a valid name or slug');

      return products.create({
        categoryId: Number(categoryId),
        name: String(input.name),
        slug: String(slug),
        description: input.description ?? null,
      });
    },
  },
  update_product: {
    destructive: false,
    definition: {
      name: 'update_product',
      description: 'Update an existing product\'s fields.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string' },
          categoryId: { type: 'number' },
          isActive: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
    execute: async (input) => {
      const { id, ...rest } = input;
      return products.update(Number(id), rest);
    },
  },
  create_category: {
    destructive: false,
    definition: {
      name: 'create_category',
      description: 'Create a product category.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'slug'],
      },
    },
    execute: async (input) => categories.create({
      name: String(input.name),
      slug: String(input.slug),
      description: input.description ?? null,
    }),
  },
  create_discount: {
    destructive: true,
    definition: {
      name: 'create_discount',
      description:
        'Create a discount code. A usage cap (maxUses, 1-10000) and a future expiry (expiresAt, ISO 8601) are BOTH required so the code cannot be unbounded. Percent discounts must be 1-100.',
      input_schema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['percent', 'fixed'] },
          value: { type: 'number' },
          minOrderAmount: { type: 'number' },
          maxUses: { type: 'number', description: 'Required. Max redemptions, 1-10000.' },
          expiresAt: { type: 'string', description: 'Required. Future ISO 8601 date-time.' },
        },
        required: ['code', 'type', 'value', 'maxUses', 'expiresAt'],
      },
    },
    execute: async (input) => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value <= 0) {
        throw httpError(400, 'Discount value must be greater than 0');
      }
      if (input.type === 'percent' && value > 100) {
        throw httpError(400, 'Percent discount cannot exceed 100');
      }
      const maxUses = Number(input.maxUses);
      if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > DISCOUNT_MAX_USES_CAP) {
        throw httpError(400, `maxUses is required and must be an integer between 1 and ${DISCOUNT_MAX_USES_CAP}`);
      }
      const expiresAt = new Date(String(input.expiresAt));
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw httpError(400, 'expiresAt is required and must be a valid future date');
      }
      return discounts.create({
        code: String(input.code),
        type: input.type,
        value,
        minOrderAmount: input.minOrderAmount != null ? Number(input.minOrderAmount) : undefined,
        maxUses,
        expiresAt,
      });
    },
  },
  create_banner: {
    destructive: true,
    definition: {
      name: 'create_banner',
      description: 'Create a storefront banner.',
      input_schema: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          linkUrl: { type: 'string' },
          position: { type: 'number' },
        },
        required: ['imageUrl'],
      },
    },
    execute: async (input, ctx) => banners.create({
      imageUrl: String(input.imageUrl),
      title: input.title ?? null,
      subtitle: input.subtitle ?? null,
      linkUrl: input.linkUrl ?? null,
      position: input.position != null ? Number(input.position) : undefined,
    }, ctx.adminId),
  },

  // ── Destructive writes (require confirmation) ─────────
  update_order_status: {
    destructive: true,
    definition: {
      name: 'update_order_status',
      description: 'Change an order\'s status. Destructive — requires confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          orderId: { type: 'number' },
          status: { type: 'string', enum: ORDER_STATUSES },
        },
        required: ['orderId', 'status'],
      },
    },
    execute: async (input) => orders.updateStatus(Number(input.orderId), input.status as OrderStatus),
  },
  publish_article: {
    destructive: true,
    definition: {
      name: 'publish_article',
      description: 'Publish an article, making it publicly visible. Destructive — requires confirmation.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
    execute: async (input) => articles.update(Number(input.id), { isPublished: true }),
  },
  delete_product: {
    destructive: true,
    definition: {
      name: 'delete_product',
      description: 'Permanently delete a product. Destructive — requires confirmation.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
    },
    execute: async (input) => {
      await products.delete(Number(input.id));
      return { deleted: true, id: Number(input.id) };
    },
  },
};

export const ADMIN_TOOL_DEFINITIONS: Anthropic.Tool[] = Object.values(ADMIN_TOOLS).map((t) => t.definition);
