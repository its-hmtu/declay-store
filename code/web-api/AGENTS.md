# Declay Store Backend — AI Agent Instructions

This document helps AI coding agents be immediately productive in the `web-api` backend.

## Quick Reference

- **Language**: TypeScript (ES2021, strict mode)
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **ORM**: Sequelize 6 (PostgreSQL 15)
- **Cache**: Redis 7
- **Package Manager**: npm
- **Start**: `npm run dev` (nodemon + ts-node, port 3001)
- **Infrastructure**: `docker-compose up -d` (PostgreSQL on 5431, Redis on 6378)

See [CLAUDE.md](../CLAUDE.md) for full architecture, domain model, and coding conventions.

---

## Critical Patterns — Follow Exactly

### 1. Module Structure (6-File Rule)
Every backend feature lives in `src/modules/<name>/` with these files (no exceptions):

```
product/
├── product.entity.ts      # Sequelize model with associations, timestamps
├── product.interface.ts   # IProduct, IProductService request/response types
├── product.validate.ts    # Zod schemas for input validation
├── product.service.ts     # Business logic (pure TS, no Express imports)
├── product.controller.ts  # HTTP handlers calling service, use sendSuccess/sendError
└── product.route.ts       # Express Router, middleware wiring, registerProductRouter()
```

**Strict rule**: Services must not import Express types. Controllers must not contain business logic.

### 2. API Response Shape
All responses go through `utils/response.ts` — never call `res.json()` directly.

**Success**:
```typescript
sendSuccess(res, data, message?, meta?);  // 200
// Returns: { success: true, message, data, meta: { total, page, limit, totalPages } }
```

**Error**:
```typescript
sendError(res, message, statusCode?, errorCode?);
// Returns: { success: false, message, data: null, meta: { code, details } }
```

### 3. Error Handling
Throw `AppError` from `utils/http-error.ts` in services. Central middleware catches and formats.

```typescript
throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
```

### 4. Validation
Use `validate(schema, 'body' | 'params' | 'query')` middleware with Zod schemas. Never validate inside controllers.

```typescript
router.post(
  '/',
  validate(createProductSchema, 'body'),
  controller.create
);
```

### 5. Authentication
- **Customer routes**: `authMiddleware` → `req.user` (`{ userId, email, jti, iat, exp }`)
- **Admin routes**: `adminAuthMiddleware` → `req.admin` (`{ adminId, email, role, jti, iat, exp }`)
- **Different JWT secrets**: `JWT_ACCESS_SECRET` vs `JWT_ADMIN_SECRET`
- **Never reuse** customer auth on admin routes

### 6. Caching
Apply `cacheMiddleware(ttl)` to GET routes returning stable data. Cache auto-invalidates on mutations.

```typescript
router.get('/', cacheMiddleware(CacheTTL.THIRTY_MIN), controller.list);
```

Available: `CacheTTL.FIVE_MIN`, `TEN_MIN`, `THIRTY_MIN`, `ONE_HOUR`.

### 7. Database Migrations
**Every schema change requires a migration**. Never use `.sync()` or `.alter: true` in production.

Naming: `NNN_description.js` + `NNN_description.sql`
```typescript
// Migrations auto-run on dev/start via predev/prestart hooks
npm run migrate       # Up
npm run migrate:down  # Down
```

### 8. Model Pattern (Sequelize)
- Define in `.entity.ts` with `underscored: true` (JS camelCase → DB snake_case)
- Associations in the same file
- Use `CreationOptional<T>` and `InferAttributes<T>` for type safety

```typescript
class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<number>;
  declare name: string;
}

Product.init({ ... }, {
  sequelize,
  tableName: 'products',
  underscored: true,  // maps camelCase to snake_case
  timestamps: true,
});
```

---

## Common Development Tasks

### Add a New Feature Module
1. Create `src/modules/<name>/` with the 6 files
2. Define Sequelize model in `*.entity.ts`, add associations
3. Write Zod schemas in `*.validate.ts`
4. Implement services in `*.service.ts` (pure TS)
5. Write controllers in `*.controller.ts` using `sendSuccess`/`sendError`
6. Define routes in `*.route.ts`, apply auth/validate middleware
7. Register router in `src/routes/index.ts`
8. Write migration for new tables/columns

### Add a New Table
1. Write a Sequelize model (entity file)
2. Create a migration: `npm run sequelize-cli migration:generate --name add_<table>`
3. Define schema in the migration file
4. Run: `npm run migrate`

### Fix a Schema Mismatch
The app calls `.sync()` in development. If drift occurs:
```bash
docker volume rm declay-db  # Drop dev DB
docker-compose up -d        # Recreate
npm run migrate             # Reapply all migrations
```

---

## Environment & Ports

**Non-standard ports** (always remember these):
- PostgreSQL: **5431** (not 5432)
- Redis: **6378** (not 6379)

**Required `.env` variables** (see `.env.example`):
- Database: `DB_HOST`, `DB_PORT=5431`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Redis: `REDIS_HOST`, `REDIS_PORT=6378`
- JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- AI: `ANTHROPIC_API_KEY` (defaults to Haiku for cost)
- Email: `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`

All env access via `src/config/env.ts`, never inline `process.env`.

---

## Common Pitfalls

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Database connection fails | Docker not running or wrong port | `docker ps` and check `DB_PORT=5431` |
| Redis connection fails | Wrong port or not running | Check `REDIS_PORT=6378` |
| JWT 401 on valid token | Secret mismatch or token expired | Verify secret matches signer; check `JWT_ACCESS_EXPIRED_IN` (default 15m) |
| Validation fails silently | Schema not applied or wrong field | Add `validate(schema, 'body')` middleware |
| Response format unexpected | Used `res.json()` instead of helper | Use `sendSuccess()` / `sendError()` |
| Stripe webhook fails locally | Not running Stripe CLI | `stripe listen --forward-to localhost:3001/api/webhooks/stripe` |

---

## Domain Model Essentials

- **Users vs Admins**: Separate tables (`users`, `admin_users`), separate auth flows
- **Product/Variant**: Price and stock live on `ProductVariant`, not `Product`
- **Orders**: Created only after Stripe payment confirmation (webhook-driven)
- **Career Applications**: `Job` and `Application` entities with status tracking

See [CLAUDE.md](../CLAUDE.md#domain-model-overview) for full details.

---

## Testing (Not Yet Implemented)

When tests are added, use:
- **Backend**: Vitest (not Jest)
- **Fixtures**: Testcontainers for integration tests

---

## Debugging

Enable debug logs:
```bash
DEBUG=declay-store:* npm run dev
```

Check connection in Redis:
```bash
redis-cli -p 6378
```

Inspect Sequelize queries:
```bash
DEBUG=sequelize:* npm run dev
```
