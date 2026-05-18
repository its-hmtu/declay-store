# CLAUDE.md — Declay Store

## Project Purpose

Declay Store is an e-commerce platform for selling handmade figures. It has three surfaces:

- **Storefront** (`web-fe`, route group `(storefront)`): Customer-facing shop — product browsing, cart, checkout, order history, blog, careers page, and an AI chatbot for read-only customer support (product Q&A, order status, shipping info).
- **Admin Dashboard** (`web-fe`, route group `(admin)`): Internal management UI (same Next.js app, protected routes) with product/category/order/article/job management, sales analytics, and an AI Assistant that can take write actions (create products, publish articles, update orders) via chat.
- **API** (`web-api`): Express + TypeScript REST backend powering both surfaces.

---

## Repository Layout

```
code/
├── web-api/          # Express + TypeScript backend
│   ├── src/
│   │   ├── modules/  # Feature modules (auth, user, address, article, product, ...)
│   │   ├── middlewares/
│   │   ├── config/   # env, sequelize, redis, passport
│   │   └── utils/    # response helpers, jwt, http-error
│   ├── migrations/   # Sequelize migrations (run these, don't sync in prod)
│   ├── seeders/
│   └── docker-compose.yml
└── web-fe/           # Next.js 16 + React 19 + Tailwind v4 frontend
    └── app/
        ├── (storefront)/  # Customer-facing pages
        └── (admin)/       # Admin dashboard pages (auth-gated layout)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + TypeScript (ES2021) |
| Backend framework | Express 4 |
| Database | PostgreSQL 15 (Docker, port 5431) |
| ORM | Sequelize 6 |
| Cache | Redis 7 (Docker, port 6378) via ioredis |
| Auth (customer) | JWT (access + refresh tokens), Passport Google OAuth 2.0 |
| Auth (admin) | JWT with separate `admin_users` table |
| Validation | Zod 4 |
| Payment | Stripe (online only — no COD) |
| Frontend | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Package manager | npm (both workspaces) |
| AI | Claude API (Anthropic SDK) with prompt caching |

---

## Domain Model Overview

### Users vs Admins
- **Customers** use the `users` table (email/password + Google OAuth).
- **Admins** live in a **separate `admin_users` table** with separate auth flow. Do not conflate the two.
- Admin routes use a separate `adminAuthMiddleware` (to be created) that reads the admin JWT.

### Products & Variants
- A **Product** is the parent figure (name, description, category, base info).
- A **ProductVariant** is a child record with its own `price`, `stock`, and `images[]`.
- Example: "Dragon Figure" → variants "Small Edition" (¥30, 50 units, 3 images) and "Limited Edition" (¥80, 10 units, 5 images).
- Never put price/stock directly on the Product — always on the variant.

### Orders & Payments
- Payment is **Stripe only** (no COD). An order is not created until Stripe confirms payment.
- Order status lifecycle: `pending_payment → paid → processing → shipped → delivered → cancelled`.
- Integrate Stripe Webhooks to update order status server-side — never trust client-side confirmation.

### Careers
- **Job** entity: title, description, requirements, location, isOpen, timestamps.
- **Application** entity: jobId (FK), applicantName, email, cvUrl (uploaded file), coverLetter, status (`received / reviewing / interview / hired / rejected`), timestamps.
- Admin can manage job listings and update application statuses.

### Articles / Blog
- `articles` table already exists (id, title, content, slug, authorId, views).
- Admin creates/edits/publishes articles. Storefront shows the public list.

---

## Key Architecture Decisions

### Module pattern (backend)
Every feature lives in `src/modules/<name>/` with exactly these files:

```
<name>.entity.ts      # Sequelize model definition
<name>.interface.ts   # TypeScript interfaces / types
<name>.validate.ts    # Zod schemas for request validation
<name>.service.ts     # Business logic (no Express types here)
<name>.controller.ts  # HTTP handlers — call service, return response
<name>.route.ts       # Express Router, wires middleware + controller
```

Services must not import Express types. Controllers must not contain business logic. Keep this separation strict when adding features.

### Standard API response shape
All responses go through `utils/response.ts`. Always use `sendSuccess()` and `sendError()` — never call `res.json()` directly.

```ts
sendSuccess(res, data, message?, meta?)   // 200
sendError(res, message, statusCode?, errorCode?)
```

### Error handling
Throw `AppError` from `utils/http-error.ts` in services. The central `error-handler.ts` middleware catches it and formats the response. Never swallow errors silently.

```ts
throw new AppError('Not found', 404, 'RESOURCE_NOT_FOUND');
```

### Validation middleware
Use the `validate` middleware with a Zod schema in routes — never validate inside controllers or services.

```ts
router.post('/', validate(createProductSchema), controller.create);
```

### Caching
Use `cacheMiddleware(ttl)` on GET routes that return stable data. Cache keys are auto-generated from the route path + user context. Invalidate related cache keys in the service when data mutates.

Available TTLs: `CacheTTL.FIVE_MIN`, `TEN_MIN`, `THIRTY_MIN`, `ONE_HOUR`.

### Authentication
- Customer routes: `authMiddleware` — verifies Bearer JWT, attaches `req.user` (`userId`, `email`).
- Admin routes: `adminAuthMiddleware` — verifies a separate admin JWT signed with a different secret, attaches `req.admin` (`adminId`, `email`, `role`).
- Never reuse the customer auth middleware on admin routes.

### Database
- **Development**: Docker Compose brings up Postgres and Redis. Run `docker-compose up -d` from `web-api/`.
- **Migrations**: Use Sequelize CLI migrations in `/migrations/`. Never use `sync({ force: true })` or `alter: true` in production. Write a migration for every schema change.
- **Models**: Define associations in the entity file and also register them in the Sequelize init if needed.

### Frontend
- Uses Next.js App Router (`app/` directory).
- All customer pages go under `app/(storefront)/`.
- All admin pages go under `app/(admin)/` with a layout that enforces admin authentication.
- API calls from the frontend use the base URL from `NEXT_PUBLIC_API_URL` env var.
- Visual style: **warm/artisan** — earthy tones, textured backgrounds, feels handcrafted. Match this in all UI work.

---

## AI Feature Design

### Storefront Chatbot (read-only)
- Client component floating widget in the `(storefront)` layout.
- Streams responses from `POST /api/chat`.
- Backend proxies to Claude API.
- System prompt context: product catalogue, policies, FAQ. **Cannot write to the DB.**
- Enable prompt caching on the system prompt (it's long and stable).

### Admin AI Assistant (write-enabled)
- Client component in the `(admin)` layout sidebar.
- Streams from `POST /api/admin/assistant`.
- System prompt context: full admin context — product list, order queue, draft articles, job listings.
- Supports **tool use**: the assistant can call internal service functions (create product, publish article, update order status, etc.) via Claude's tool-use API.
- Always confirm destructive actions (delete, status change) with the admin before executing.

---

## Coding Conventions

### TypeScript
- Strict mode is on — no `any`, no type assertions unless unavoidable.
- Define request/response shapes in `*.interface.ts`; reuse them in controllers and services.
- Use path alias `@/*` (maps to `src/*` in web-api, `app/*` in web-fe).

### Naming
- Files: `kebab-case` (e.g., `product-variant.service.ts`)
- Classes and types: `PascalCase`
- Functions and variables: `camelCase`
- Database columns: `camelCase` in Sequelize models, mapped to `snake_case` in Postgres via `underscored: true`
- Route paths: lowercase, hyphenated (e.g., `/api/product-variants`)

### Comments
Write comments only when the **why** is non-obvious. Never describe what the code does — the types and names do that.

### No test framework yet
There is currently no test setup. When adding tests, use Vitest (backend) and React Testing Library (frontend) — do not introduce Jest.

---

## Environment Setup

```bash
# Start infrastructure
cd web-api && docker-compose up -d

# Backend
cd web-api
cp .env.example .env   # fill in secrets
npm install
npm run dev            # nodemon + ts-node on PORT (default 3001)

# Frontend
cd web-fe
npm install
npm run dev            # next dev on port 3000
```

Required `.env` variables are in `web-api/.env.example`. All env access goes through `src/config/env.ts` — add new variables there, not inline `process.env`.

Key non-default ports (don't forget these):
- PostgreSQL: `5431` (not 5432)
- Redis: `6378` (not 6379)

---

## Adding a New Feature Module (backend)

1. Create `src/modules/<name>/` with the six files listed in the module pattern above.
2. Define the Sequelize entity and add associations if needed.
3. Write Zod schemas in `*.validate.ts`.
4. Implement business logic in `*.service.ts` (pure TypeScript, no Express).
5. Write controller methods that call the service and use `sendSuccess` / `sendError`.
6. Define routes in `*.route.ts`, apply the correct auth middleware and `validate`.
7. Register the router in `src/app.ts`.
8. Write a Sequelize migration for any new tables or columns.

## Adding a New Page (frontend)

1. Add the page under `app/(storefront)/` (customer) or `app/(admin)/` (admin).
2. Fetch data via server components where possible; use client components only for interactivity.
3. API calls hit `process.env.NEXT_PUBLIC_API_URL` — do not hardcode URLs.
4. Protect admin pages via the `(admin)` layout's auth check; do not duplicate auth logic per page.
5. Follow the warm/artisan visual style — earthy palette, clean typography, generous white space.

## Adding a Product with Variants

1. `POST /api/products` creates the parent product (name, description, categoryId).
2. `POST /api/products/:id/variants` creates each variant with `{ name, price, stock, images[] }`.
3. Frontend product detail page fetches the product + all variants and lets the user select one before adding to cart.
4. Cart stores `variantId`, not `productId`.

## Integrating Stripe

1. Create a Stripe PaymentIntent on the backend (`POST /api/orders/checkout`).
2. Return `clientSecret` to the frontend; use Stripe.js Elements to collect card details.
3. On success, Stripe calls the webhook (`POST /api/webhooks/stripe`). The webhook handler sets order status to `paid`.
4. Never trust the client to confirm payment — the webhook is the source of truth.

---

## Debugging Common Issues

**Database connection fails on startup**
Check that Docker containers are running: `docker ps`. Confirm `DB_PORT=5431` in `.env` (not the default 5432).

**Redis errors**
Redis runs on port `6378` (not default 6379). Confirm `REDIS_PORT=6378` in `.env`.

**JWT 401 on valid token**
Check that `JWT_ACCESS_SECRET` in `.env` matches the secret used to sign the token. Access tokens expire quickly — check `JWT_ACCESS_EXPIRED_IN`. For admin routes, check the separate admin JWT secret.

**Zod validation error in response**
The `validate` middleware returns a 400 with field-level errors. Inspect the `errors` array in the response body for the exact failing field and constraint.

**Sequelize sync vs migration mismatch**
The app currently calls `sequelize.sync()` in development. If the DB schema drifts from the models, drop and recreate the dev DB via Docker volume, or write a corrective migration.

**Stripe webhook not firing locally**
Use the Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`. Confirm `STRIPE_WEBHOOK_SECRET` in `.env` matches the CLI-provided secret.

**Google OAuth not working**
Ensure `GOOGLE_CALLBACK_URL` matches the redirect URI registered in Google Cloud Console exactly (including protocol and port).

---

## What Not to Do

- Do not put business logic in controllers.
- Do not call `res.json()` directly — use `sendSuccess` / `sendError`.
- Do not access `process.env` directly — go through `src/config/env.ts`.
- Do not use `sync({ force: true })` or `alter: true` outside local throwaway dev.
- Do not add features or abstractions beyond what the current task requires.
- Do not hardcode API URLs in the frontend.
- Do not reuse the customer `authMiddleware` on admin routes — they use separate tables and separate JWTs.
- Do not put price or stock on the Product entity — they belong on `ProductVariant`.
- Do not create an order until Stripe confirms payment via webhook.
- Do not let the storefront chatbot write to the database — it is strictly read-only.
