# Copilot instructions for Declay Store

Quick pointers for AI coding agents working in this repository. Read the linked docs first.

- Primary references: [AGENTS.md](./AGENTS.md) and [CLAUDE.md](./CLAUDE.md). Use them as authoritative sources.
- Local dev: Start infra from `web-api` with `docker-compose up -d`, then run `npm run dev` in `web-api` and `web-fe`.
- Backend pattern: Follow the `src/modules/<name>/` six-file pattern (entity, interface, validate, service, controller, route).
- Responses: Use `sendSuccess()` / `sendError()` from `utils/response.ts` for all HTTP handlers.
- DB safety: Always create a Sequelize migration for schema changes; never use `.sync()` in production code.
- Auth: Customers and admins use separate JWT secrets and middleware. Do not conflate them.
- Payments: Orders must be created only after Stripe webhook confirms payment — do not trust client confirmations.
- AI features: Storefront chatbot is read-only; admin assistant may perform write actions but must confirm destructive actions.
- Ports: Postgres uses `5431`, Redis uses `6378`, backend runs on `3001`, frontend on `3000` by default.
- When unsure: Ask a concise clarifying question before making changes that affect data, auth, or payments.

If you need more detailed conventions (linting, build, testing), see the per-area AGENTS.md files in `web-api/` and `web-fe/`.
