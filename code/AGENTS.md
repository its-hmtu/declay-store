# Declay Store — AI Agent Quick Reference

This is a **quick reference** for AI agents working on the Declay Store e-commerce platform. For detailed conventions and architecture, see [CLAUDE.md](./CLAUDE.md).

---

## Project Overview

**Declay Store** is an e-commerce platform for handmade figures with three surfaces:

1. **Storefront** (`web-fe` / `(storefront)` route group): Customer-facing shop
2. **Admin Dashboard** (`web-fe` / `(admin)` route group): Internal management UI
3. **REST API** (`web-api`): Express + TypeScript backend

---

## Tech Stack at a Glance

| Component | Tech | Key Detail |
|-----------|------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind v4 | App Router; warm/artisan aesthetic |
| **Backend** | Express 4, TypeScript, Sequelize 6 | Strict 6-file module pattern |
| **Database** | PostgreSQL 15 (Docker) | Port **5431** (not 5432) |
| **Cache** | Redis 7 (Docker) | Port **6378** (not 6379) |
| **Auth** | JWT (separate secrets for customer/admin) | Token auto-refresh on frontend |
| **Payment** | Stripe (webhook-driven order creation) | Never trust client confirmation |
| **AI** | Claude API (Anthropic SDK) | Prompt caching on system prompts |

---

## Start Local Development

```bash
# 1. Start infrastructure
cd web-api && docker-compose up -d

# 2. Start backend
cd web-api
cp .env.example .env  # Fill in secrets
npm install
npm run dev           # Nodemon + ts-node, port 3001

# 3. Start frontend (in a new terminal)
cd web-fe
npm install
npm run dev           # Next.js dev, port 3000
```

Visit: http://localhost:3000 (storefront), http://localhost:3000/admin/login (admin)

---

## Critical Patterns — Memorize These

### Backend Module Structure (web-api)
Every feature is in `src/modules/<name>/` with exactly 6 files:
```
<name>.entity.ts      → Sequelize model + associations
<name>.interface.ts   → TypeScript types
<name>.validate.ts    → Zod schemas
<name>.service.ts     → Business logic (no Express)
<name>.controller.ts  → HTTP handlers (call service, use sendSuccess/sendError)
<name>.route.ts       → Express router + middleware
```

**Strict rule**: Services don't know about Express. Controllers don't have logic.

### API Response Shape
Always use `sendSuccess()` / `sendError()` from `utils/response.ts`. Never call `res.json()` directly.

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

### Authentication (Backend)
- **Customer**: `authMiddleware` → `req.user` (from `users` table)
- **Admin**: `adminAuthMiddleware` → `req.admin` (from `admin_users` table)
- **Different JWT secrets**: `JWT_ACCESS_SECRET` vs `JWT_ADMIN_SECRET`
- **Never reuse** customer auth on admin routes

### Frontend Pages
```
(storefront)/     → Public customer pages
(admin)/
  login/          → Public admin login
  (protected)/    → Auth-gated admin pages
```

Server components preferred for data fetching; client components for state/interactivity.

### Database
- **Every schema change** requires a Sequelize migration
- Migrations auto-run on `npm run dev` and `npm start`
- Column names: `camelCase` in code → `snake_case` in DB (via `underscored: true`)
- Never use `.sync()` or `.sync({ alter: true })` in production

---

## Routing Quick Reference

### Backend API Routes
All under `/api` prefix:

```
GET    /api/products                    → List products (cached)
GET    /api/products/:id                → Get product detail
POST   /api/products                    → Create (admin)
GET    /api/products/:id/variants       → Variants of product
POST   /api/products/:id/variants       → Add variant (admin)

GET    /api/cart                        → Get user's cart
POST   /api/cart/items                  → Add to cart
DELETE /api/cart/items/:variantId       → Remove from cart

POST   /api/orders/checkout             → Create Stripe intent
POST   /api/orders                      → Create order (after payment)
GET    /api/orders                      → List user's orders

POST   /api/chat                        → Storefront chatbot (read-only)
POST   /api/admin/assistant             → Admin assistant (write-enabled)

POST   /api/auth/register               → Customer signup
POST   /api/auth/login                  → Customer login
POST   /api/auth/logout                 → Revoke token
POST   /api/auth/refresh                → Refresh access token

POST   /api/admin/auth/login            → Admin login
POST   /api/admin/auth/logout           → Admin logout

POST   /api/webhooks/stripe             → Stripe webhook (creates orders)
```

### Frontend Routes
```
(storefront):
  /                                   → Home
  /products                           → Product list
  /products/[slug]                    → Product detail
  /cart                               → Cart
  /checkout                           → Checkout
  /orders                             → Order history (auth required)
  /blog                               → Articles
  /careers                            → Job listings
  /auth/google/callback               → OAuth callback

(admin):
  /admin/login                        → Admin login (public)
  /admin                              → Dashboard (auth required)
  /admin/users                        → User management
  /admin/products                     → Product management
  /admin/orders                       → Order management
  /admin/articles                     → Article management
  /admin/jobs                         → Job management
```

---

## Common Development Tasks

### Add a New Product Feature
1. Create `src/modules/product-feature/` with 6 files
2. Add migration: `npm run sequelize-cli migration:generate --name add_product_feature`
3. Define schema in `.sql` file, register in `.js` file
4. Run: `npm run migrate`
5. Define Sequelize model in `.entity.ts`
6. Implement service, controller, router
7. Register in `src/routes/index.ts`
8. Test: `curl http://localhost:3001/api/product-feature`

### Fix a Validation Error
1. Check the response `meta.details` to see which fields failed
2. Update the Zod schema in `*.validate.ts`
3. Re-run the request

### Debug a Database Issue
```bash
# Drop and recreate dev database
docker volume rm declay-db
docker-compose up -d

# Rerun migrations
npm run migrate

# Reseed (if needed)
npm run seed
```

### Add a Frontend Page
1. Create file under `app/(storefront)/` or `app/(admin)/(protected)/`
2. For interactive pages, create a `*Client.tsx` file with `'use client'`
3. Use `lib/api.ts` for API calls
4. Import components from `components/storefront/` or `components/admin/`

### Integrate Stripe Payment
1. `POST /api/orders/checkout` → get `clientSecret`
2. Use Stripe.js Elements on frontend to collect card details
3. Confirm payment with Stripe
4. Stripe webhook calls `POST /api/webhooks/stripe`
5. Webhook handler creates order with status `paid`

---

## Environment Variables Checklist

### Backend (web-api/.env)
- `DB_HOST`, `DB_PORT=5431`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT=6378`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`

### Frontend (web-fe/.env.local)
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

All env access via `src/config/env.ts` (backend) or env file (frontend) — never inline `process.env`.

---

## Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| Database won't connect | Docker not running or wrong port | `docker ps` and check `DB_PORT=5431` |
| Redis connection fails | Wrong port | Check `REDIS_PORT=6378` |
| API 400 validation error | Missing or wrong field in request | Check response `meta.details` for field names |
| API 401 Unauthorized | Token expired or wrong secret | Clear token, log in again |
| Frontend stuck on page | Auth check infinite loop | Move auth check to client component with `useEffect` |
| Stripe webhook not firing locally | Not using Stripe CLI | Run `stripe listen --forward-to localhost:3001/api/webhooks/stripe` |
| Styling missing on frontend | Tailwind not compiled | Ensure `globals.css` imported in root layout |
| Next.js API broken | Training data out of date | Check `node_modules/next/dist/docs/` |

---

## Domain Model Quick Reference

- **Users** vs **Admins**: Separate tables, separate auth, separate JWT secrets
- **Product** vs **ProductVariant**: Price/stock on variant, not product
- **Orders**: Created only after Stripe webhook confirms payment
- **Jobs** & **Applications**: Career posting system with application tracking
- **Articles**: Blog content, managed by admins, public on storefront
- **Coupons & Discounts**: Order-level pricing adjustments

For full domain model, see [CLAUDE.md — Domain Model Overview](./CLAUDE.md#domain-model-overview).

---

## Testing (Not Yet Implemented)

When tests are added:
- **Backend**: Vitest (not Jest)
- **Frontend**: React Testing Library + Vitest
- Use Testcontainers for integration tests (PostgreSQL, Redis)

---

## Useful Commands

```bash
# Backend
npm run dev              # Start with nodemon
npm run build            # Compile TypeScript
npm start                # Run compiled JS
npm run migrate          # Run pending migrations
npm run migrate:down     # Rollback last migration
npm run seed             # Seed database

# Frontend
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Serve production build
npm run lint             # Run ESLint

# Infrastructure
docker-compose up -d     # Start PostgreSQL + Redis
docker-compose down      # Stop containers
docker volume rm declay-db  # Reset database

# Stripe (if webhook testing)
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## Where to Go Next

- **Add a backend feature?** Read [web-api/AGENTS.md](./web-api/AGENTS.md)
- **Add a frontend page?** Read [web-fe/AGENTS.md](./web-fe/AGENTS.md)
- **Understand architecture?** Read [CLAUDE.md](./CLAUDE.md)
- **Stuck on something?** Check [CLAUDE.md — Debugging](./CLAUDE.md#debugging-common-issues)
