# Tests

## Unit tests (no DB/Redis — fast, run everywhere)
```
npm install
npm test          # vitest run (tests/unit/**)
npm run test:watch
```
25 tests covering the pure business logic:
- `order.pricing` — shipping zone, fee + free-over, order total, forward-only status transitions (W-14/W-15/W-21)
- `requireRole` — admin/super_admin gating (W-05/W-06)
- `sanitizeAuditBody` — audit redaction (W-09)
- rate limiters exist (W-10)
- `slugify` — tag slugs incl. Vietnamese diacritics (W-23)

## Integration tests (throwaway Postgres; some need Redis)
```
# point DB_* at an empty test DB, migrate, then:
RUN_DB_TESTS=true DB_NAME=declay_test npm run migrate
RUN_DB_TESTS=true DB_NAME=declay_test npm run test:integration
```
- `stock-oversell` / `stock-reservation` — anti-oversell invariant + reserve/release (W-02/W-03), Postgres only
- `discount-validation` — validateCode percent / min-order / unknown code, Postgres only

## Flows best covered end-to-end by a running stack
Idempotent Stripe webhook (W-01), full reservation expiry job (W-03), notifications
(W-16/W-17), fulfillment (W-08) and role/AI gating over HTTP need Postgres + Redis +
Stripe test keys. See `docs/business-analysis/06-uat-test-cases.md` for the manual/UAT
scenarios and the traceability matrix (hardening item → test case). Extend the
integration suite with supertest against `createApp()` in that environment.
