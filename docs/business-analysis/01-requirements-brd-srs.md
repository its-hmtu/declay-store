# Declay Store — Business & Software Requirements (BRD / SRS)

**Document type:** Business Requirements Document + Software Requirements Specification
**Product:** Declay Store — e-commerce platform for handmade figures
**Prepared by:** Business Analysis (Claude)
**Date:** 2026-06-19 (original) · **Re-audited 2026-07-07**
**Status:** Draft v2 — grounded in current codebase audit
**Audience:** Product owner, engineering, QA

> This document combines a business-level view (BRD: why, who, what value) with a system-level specification (SRS: functional and non-functional requirements). Requirements are tagged with an implementation status reflecting the **actual state of the code as of this audit**, not just the documented intent. See `04-feature-backlog-roadmap-gap-analysis.md` for the detailed gap register.
>
> Status legend: ✅ Built & wired · 🟡 Partial / scaffolded · 🔴 Not started
>
> **2026-07-07 re-audit:** rows below marked with a trailing "(re-audited)" note changed status since 2026-06-19. The working tree has ~19 days of uncommitted work not reflected in the original version of this document (see `04-feature-backlog-roadmap-gap-analysis.md` §0 for the full list of new risks this surfaced — notably webhook idempotency, a fully-simulated fulfillment pipeline, and role enforcement applied to only one route).

---

## 1. Executive Summary

Declay Store is a single-brand direct-to-consumer e-commerce platform for selling handmade figures (collectible clay/resin figurines). It is composed of three surfaces sharing one backend:

1. **Storefront** — the public shop where customers browse products, manage a cart, check out and pay online, track orders, read the blog, and view/apply to job openings. A read-only AI chatbot assists customers.
2. **Admin Dashboard** — an internal, authentication-gated UI where staff manage the catalogue, orders, content (articles, banners), promotions, and careers, and view sales analytics. A write-enabled AI assistant helps staff perform tasks.
3. **API** — an Express + TypeScript REST backend powering both surfaces, integrating PostgreSQL, Redis, Stripe, Google OAuth, SMTP email, and (planned) the Claude API.

The commerce core (catalogue → cart → Stripe checkout → order lifecycle → webhook confirmation) is implemented. The differentiating AI features and several supporting commerce features (promotions, reviews UI, shipment tracking, content merchandising) are partially built or not started.

---

## 2. Business Context & Objectives

### 2.1 Business goals

| # | Goal | Success measure (proposed) |
|---|------|----------------------------|
| BG-1 | Sell handmade figures directly online with secure online payment | First successful live Stripe order; payment success rate ≥ 98% |
| BG-2 | Give a small team efficient tools to run the shop without engineering help | Admin can create a product with variants and publish it in < 5 min |
| BG-3 | Differentiate through AI-assisted shopping and operations | Chatbot deflects ≥ 30% of routine pre-sale questions; assistant reduces admin task time |
| BG-4 | Build brand and organic traffic via content (blog) and careers presence | Blog publishing live; SEO-friendly slugs in place |
| BG-5 | Convert browsers to buyers and increase repeat purchase | Cart→order conversion tracked; wishlist and reviews live |

### 2.2 Business drivers & constraints

- **Single brand, single store** — no multi-vendor / marketplace requirements.
- **Online payment only** — Stripe, no cash-on-delivery. An order is not created until payment is confirmed.
- **Small operations team** — roles are `super_admin`, `admin`, `editor`. The admin UI must be self-service.
- **Vietnam-first** — default country Vietnam, address model uses ward/district/city; timezone Asia/Ho_Chi_Minh. Should not preclude international shipping later.
- **Brand aesthetic** — warm/artisan visual identity (earthy tones, handcrafted feel) is a product requirement, not just styling preference.

### 2.3 Out of scope (current phase)

Multi-vendor marketplace; physical POS / in-store; subscriptions or recurring billing; multi-currency; native mobile apps; cash-on-delivery; complex warehouse/inventory across locations.

---

## 3. Stakeholders & Actors

| Actor | Type | Description / goals |
|-------|------|---------------------|
| **Guest** | Human, unauthenticated | Browse catalogue, search, read blog/careers, ask chatbot questions. Must register/log in to purchase. |
| **Customer** | Human, authenticated | Manage profile & addresses, cart, wishlist, checkout & pay, view order history, write reviews, apply to jobs. |
| **Editor** (admin role) | Human, staff | Manage content: articles, banners; limited catalogue edits. No destructive financial actions. |
| **Admin** (admin role) | Human, staff | Full catalogue, order, promotion, careers management; view analytics. |
| **Super Admin** (admin role) | Human, staff | All admin powers plus admin-user management and site settings. |
| **Storefront Chatbot** | AI system | Read-only assistant: product Q&A, order status, shipping/policy info. Cannot write to DB. |
| **Admin AI Assistant** | AI system | Write-enabled assistant via tool-use: create products, publish articles, update orders — with confirmation for destructive actions. |
| **Stripe** | External system | Payment processing; source of truth for payment status via webhooks. |
| **Google OAuth** | External system | Federated customer sign-in. |
| **SMTP / Email provider** | External system | Transactional email: verification, password reset, order notifications. |
| **Claude API** | External system | LLM backing both AI surfaces (planned). |

---

## 4. Business / High-Level Requirements (BRD)

| ID | Requirement | Priority |
|----|-------------|----------|
| BR-1 | Customers can discover products by category, search, and tags, and view product detail with selectable variants. | Must |
| BR-2 | Customers can register and authenticate via email/password or Google, with verified email. | Must |
| BR-3 | Customers can build a cart, apply a discount code, and pay online via Stripe. | Must |
| BR-4 | Orders are only created upon confirmed payment, with an auditable status lifecycle. | Must |
| BR-5 | Customers can view order history and track shipment status. | Must |
| BR-6 | Staff can manage the full catalogue (products, variants, categories, tags, images). | Must |
| BR-7 | Staff can manage orders, update status, and handle refunds/cancellations. | Must |
| BR-8 | Staff can publish content — **Journals** (blog articles) and merchandising banners. | **Must** *(raised from Should, 2026-08-05)* |
| BR-9 | Staff can manage promotions (discount codes). | Should |
| BR-10 | The business can recruit via public job listings and manage applications — **Careers**, incl. online CV submission. | **Must** *(raised from Should, 2026-08-05)* |
| BR-11 | Customers receive AI-assisted, read-only shopping help. | Should |
| BR-12 | Staff receive AI-assisted operations support with action confirmation. | Could |
| BR-13 | Customers can save items to a wishlist and leave product reviews. | Should |
| BR-14 | The platform presents a consistent warm/artisan brand experience. | Must |

---

## 5. Functional Requirements (SRS)

Functional requirements are grouped by domain. Each carries a current implementation status from the code audit.

### 5.1 Identity & Access — Customers

| ID | Requirement | Status |
|----|-------------|--------|
| FR-AUTH-1 | Register with email, password, full name, phone. Passwords hashed (bcrypt). | ✅ |
| FR-AUTH-2 | Log in with email/password; issue JWT access + refresh tokens. | ✅ |
| FR-AUTH-3 | Refresh access token via refresh token. | ✅ |
| FR-AUTH-4 | Sign in / sign up with Google OAuth 2.0 (Passport). | ✅ |
| FR-AUTH-5 | Email verification via tokenized link. | 🟡 (re-audited: backend/email fully built via `auth.service.ts` + BullMQ; **no frontend page** consumes the link) |
| FR-AUTH-6 | Password reset via tokenized link. | 🟡 (re-audited: same pattern — backend done, frontend page missing) |
| FR-AUTH-7 | Manage own profile (name, phone, email). | ✅ |
| FR-AUTH-8 | Manage multiple shipping addresses; exactly one default per user (enforced by partial unique index). | ✅ |

### 5.2 Identity & Access — Admin

| ID | Requirement | Status |
|----|-------------|--------|
| FR-ADM-1 | Admin login against a **separate** `admin_users` table with a separate JWT secret. | ✅ |
| FR-ADM-2 | Role-based access: `super_admin`, `admin`, `editor`. | 🟡 (re-audited: `requireRole()` middleware now exists and is correctly implemented, but is wired on only `/api/admin/users` — every other admin route, including destructive ones, still accepts any role) |
| FR-ADM-3 | `adminProtect` middleware guards all `/api/admin/*` routes. | ✅ |
| FR-ADM-4 | Super admin manages admin users (CRUD, role assignment). | ✅ (re-audited: `admin-user` module built, route-wired, correctly gated with `requireRole('super_admin')`) |
| FR-ADM-5 | Manage global site settings (key/value store). | ✅ (re-audited: `site-setting` module built and route-wired; note it is **not** role-gated to super_admin as one might expect) |

### 5.3 Catalogue

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CAT-1 | Categories with hierarchy (self-referencing parent), slug, active flag. | ✅ |
| FR-CAT-2 | Products belong to a category; have name, slug, description, active flag. **No price/stock on product.** | ✅ |
| FR-CAT-3 | Product variants carry price, stock, and image array; one product → many variants. | ✅ |
| FR-CAT-4 | Public product listing with pagination, filtering by category, and search. | ✅ (caching middleware available) |
| FR-CAT-5 | Public product detail by slug, including all active variants. | ✅ |
| FR-CAT-6 | Tagging of products (and articles) via many-to-many tags. | 🔴 (unchanged: `tag.entity.ts` only, no service/route) |
| FR-CAT-7 | Admin CRUD for categories, products, and variants. | ✅ |
| FR-CAT-8 | Image upload/storage for variant images. | 🟡 (re-audited: upload pipeline now built — `upload` module, multer, admin-only, 5MB image types — but stores to **local disk**, not managed object storage) |

### 5.4 Cart & Wishlist

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CART-1 | One cart per user; cart items reference a **variant** (not product) + quantity ≥ 1. | ✅ |
| FR-CART-2 | Add/update/remove cart items; view cart with computed totals. | ✅ |
| FR-CART-3 | Wishlist: one per user; items reference variants; unique per (wishlist, variant). | ✅ (re-audited: FE page + `WishlistButton.tsx` now exist) |

### 5.5 Checkout, Orders & Payments

| ID | Requirement | Status |
|----|-------------|--------|
| FR-ORD-1 | Create checkout from cart: compute total, create Stripe PaymentIntent, return `clientSecret`. Order created in `pending_payment`. | ✅ |
| FR-ORD-2 | Order line items snapshot price, variant name, and product name at purchase time. | ✅ |
| FR-ORD-3 | Stripe webhook (`payment_intent.succeeded`) marks order `paid` (signature-verified, raw body). | ✅ |
| FR-ORD-4 | Order status lifecycle: `pending_payment → paid → processing → shipped → delivered → cancelled`. | ✅ (enum + admin update) |
| FR-ORD-5 | Customer views own order history (paginated) and order detail. | ✅ |
| FR-ORD-6 | Customer cancels an order; if already paid, issue Stripe refund. | ✅ |
| FR-ORD-7 | Apply discount code at checkout (orders carry `discount_code_id`, `discount_amount`). | ✅ (re-audited: `discount` module built, validated with Zod, wired into checkout total and into `markAsPaid` usage counting) |
| FR-ORD-8 | Shipment tracking: carrier, tracking number, estimated/actual delivery. | 🟡 (re-audited: `order-shipment` module and customer/admin routes built — **but** carrier/tracking/delivery are now auto-generated by a simulated fulfillment pipeline, not admin-entered as originally scoped; needs product-owner confirmation, see `04-...md` §0 item 2) |
| FR-ORD-9 | Admin lists/filters all orders and updates status. | ✅ |
| FR-ORD-10 | Decrement variant stock on successful payment; prevent oversell. | 🟡 (re-audited: `ProductVariant.decrement` runs inside a DB transaction, but still has no `WHERE stock >= qty` floor guard **and** `markAsPaid` has no idempotency check — a duplicate webhook delivery will decrement stock twice; this is now the single highest-risk open item) |

### 5.6 Reviews

| ID | Requirement | Status |
|----|-------------|--------|
| FR-REV-1 | Authenticated customers post one review per product (1–5 rating, title, body). | ✅ (API) |
| FR-REV-2 | Reviews flagged `is_verified_purchase` when the user bought the product. | 🟡 (column exists; verification logic TBD) |
| FR-REV-3 | Public product detail shows reviews and aggregate rating. | 🟡 (re-audited: `ProductReviews.tsx` component now exists; aggregate-rating display not confirmed) |
| FR-REV-4 | Admin moderates reviews. | 🟡 (admin review router exists; `/admin/reviews` FE page now exists too) |

### 5.7 Content & Merchandising

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CON-1 | Admin/editor creates, edits, publishes blog articles — **"Journals"** (slug, content, author, views, publish flag). | ✅ **MVP-MUST** (promoted 2026-08-05) |
| FR-CON-2 | Storefront lists published articles and shows article detail; increments views. | ✅ **MVP-MUST** (promoted 2026-08-05) |
| FR-CON-3 | Homepage/merchandising banners with schedule, position, link, active flag. | ✅ (re-audited: `banner` module built, public list cached 10 min, admin CRUD, `BannerCarousel.tsx` on storefront) |
| FR-CON-4 | Article tagging. | 🔴 (unchanged — depends on the still-unbuilt `tag` module) |

### 5.8 Careers

> **Scope change 2026-08-05:** Careers is now **in the MVP MUST tier** (see `discovery/03-scope-and-mvp.md` §2 and `discovery/10-mvp-srs-and-design.md` FR-25..27), not a post-launch nicety.

| ID | Requirement | Status |
|----|-------------|--------|
| FR-JOB-1 | Public listing of open jobs and job detail. | ✅ **MVP-MUST** |
| FR-JOB-2 | Visitors apply to a job with name, email, CV upload, cover letter. | ✅ **MVP-MUST** (re-audited 2026-08-05: **the earlier 🟡 is now stale.** `createCvUploadRouter` is mounted publicly at `POST /api/careers/cv` — `uploadLimiter` rate limit, PDF/DOC/DOCX only, 10 MB cap, stored to Cloudinary `declay/cvs` as `raw`. `ApplyForm.tsx` posts the file and fills `cvUrl` automatically; the manual URL field remains as a fallback. W-19 is genuinely done.) |
| FR-JOB-3 | Admin manages job listings and application statuses (`received → reviewing → interview → hired → rejected`). | ✅ **MVP-MUST** (note: `job` and `job-application` admin routers use `requireRole('admin','super_admin')` — **Editor/Staff tokens are rejected**) |

### 5.9 AI Features

| ID | Requirement | Status |
|----|-------------|--------|
| FR-AI-1 | Storefront chatbot: streamed responses from `POST /api/chat`, backend proxy to Claude API, read-only context (catalogue, policies, FAQ), prompt caching on system prompt. | ✅ (re-audited: `chat` module built, `src/lib/claude.ts` wraps the Anthropic SDK, `ChatWidget.tsx` on storefront; no tools registered, so it is read-only by construction) |
| FR-AI-2 | Admin assistant: streamed from `POST /api/admin/assistant`, tool-use to perform actions (create product, publish article, update order), confirmation on destructive actions. | ✅ (re-audited: `assistant` module built with a real tool-use loop — search/list/create/update tools plus a Redis-backed confirmation gate for destructive tools (`update_order_status`, `publish_article`, `delete_product`); `AssistantWidget.tsx` on the admin dashboard) |
| FR-AI-3 | Persist chat sessions and messages (incl. tool calls in JSONB). | ✅ (re-audited: actively written by both `chat` and `assistant` services) |
| FR-AI-4 | Guardrails: storefront assistant cannot mutate data; admin assistant requires auth + confirmation. | 🟡 (re-audited: storefront chatbot has no tools, so it structurally cannot mutate data ✅. Admin assistant requires `adminProtect` and has a working confirmation gate for tools flagged `destructive: true` ✅ — but **no role check** (any `admin`/`editor` token can use it, not just `admin`/`super_admin` per the actor table), **`create_discount`/`create_banner` are classified non-destructive and execute instantly** despite financial impact, and there is **no dedicated audit log** beyond the chat message history. See `04-feature-backlog-roadmap-gap-analysis.md` §0a for the full risk assessment.) |

### 5.10 Notifications

| ID | Requirement | Status |
|----|-------------|--------|
| FR-NOT-1 | Transactional email via SMTP (verification, password reset, order confirmation, shipping updates). | ✅ (re-audited: BullMQ-backed `email-queue.ts` with retry/backoff sends real emails for verification, password reset, and every order status change) |

---

## 6. Non-Functional Requirements (NFRs)

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-SEC-1 | Security | Passwords hashed with bcrypt; secrets only via `config/env`; Helmet headers enabled; CORS configured per environment (currently permissive — tighten for prod). |
| NFR-SEC-2 | Security | JWTs: short-lived access + refresh; **separate** secret for admin tokens; never reuse customer middleware on admin routes. |
| NFR-SEC-3 | Security | Stripe webhook signature verification with raw body; never trust client payment confirmation. |
| NFR-SEC-4 | Security | Input validation on all write endpoints via Zod `validate` middleware. |
| NFR-SEC-5 | Security | Production DB connections use SSL; admin write actions auditable (recommended audit log — not yet present). |
| NFR-PERF-1 | Performance | Redis caching on stable GET routes with tiered TTLs (5/10/30/60 min); cache invalidation on mutation. |
| NFR-PERF-2 | Performance | Appropriate indexes on lookup columns (present across schema: slugs, FKs, status, email). |
| NFR-PERF-3 | Performance | AI responses streamed to the client; prompt caching on long stable system prompts to control latency/cost. |
| NFR-REL-1 | Reliability | Financial mutations (order creation, stock decrement, refund) wrapped in DB transactions. |
| NFR-REL-2 | Reliability | Webhook idempotency: repeated `payment_intent.succeeded` must not double-process (recommend event de-dup). |
| NFR-SCALE-1 | Scalability | Stateless API behind a load balancer; session store should move to Redis for horizontal scale (currently default session store). |
| NFR-MAINT-1 | Maintainability | Strict module pattern (entity/interface/validate/service/controller/route); services free of Express types; standard response envelope (`sendSuccess`/`sendError`). |
| NFR-MAINT-2 | Maintainability | TypeScript strict mode; no `any`; `@/*` path alias; kebab-case files, camelCase↔snake_case via `underscored`. |
| NFR-PORT-1 | Portability | Dockerized Postgres (5431) and Redis (6378); env-driven config; migrations tracked via Sequelize CLI. |
| NFR-OBS-1 | Observability | Request logging (morgan) present; structured logging, error tracking, and metrics recommended for prod. |
| NFR-TEST-1 | Quality | No test framework yet. Target Vitest (backend) + React Testing Library (frontend); do not introduce Jest. |
| NFR-A11Y-1 | Accessibility/UX | Warm/artisan visual system applied consistently; responsive; semantic, accessible markup. |
| NFR-I18N-1 | Localization | Vietnam-first (address model, default country, timezone). Architecture should not block future internationalization. |

---

## 7. Assumptions

1. Single brand / single store; no marketplace or multi-tenant needs in this phase.
2. All payments are online via Stripe; no COD; refunds handled through Stripe.
3. Inventory is tracked at the variant level only; no multi-warehouse.
4. Email deliverability handled by an external SMTP provider configured via env.
5. AI features use the Claude API; an API key and budget will be provisioned (not yet in `.env.example`).
6. CV and product images require an object-storage/upload solution to be selected (e.g., S3-compatible); currently only URLs/paths are stored.
7. The Vietnamese-language report artifacts in the repo (`Bao-cao-*`, `PTTK-*`) are prior project documentation; this BA set is the English, build-oriented source of truth.

## 8. Open Questions (for Product Owner)

These materially affect scope and design. See the cover note for how they're tracked.

> **2026-07-07 update:** questions #1 and #2 have effectively been **answered by implementation** rather than by explicit product-owner decision — flagging both for confirmation, since an implicit engineering decision on scope/architecture questions carries risk if it doesn't match business intent.

1. ~~**AI priority & budget**~~ — **Answered by implementation**: both the storefront chatbot and admin assistant are now built against `ANTHROPIC_API_KEY` (Claude Haiku for both surfaces by default, per `.env.example`). Confirm this was an intentional near-term priority and that there is an actual API budget/rate-limit plan — no rate limiting exists yet on either `/api/chat` or `/api/admin/assistant`, so cost exposure is currently uncapped.
2. ~~**Image & file storage**~~ — **Partially answered by implementation**: product/variant image upload now uses local disk storage on the API container (not S3/Cloudinary). This works for a single instance but conflicts with the horizontally-scaled target architecture, and CVs still have no upload path at all. Confirm whether local disk is acceptable for the current deployment size or whether object storage should be prioritized before more images accumulate.
3. **Shipping model** — **Now has a de facto answer that needs sign-off, not a decision from scratch**: the codebase auto-simulates carrier + tracking + delivery timing (no real carrier integration, no admin data entry). Product owner must confirm whether this simulation is acceptable for launch (e.g., a deliberate placeholder) or must be replaced with manual entry / a real carrier API (GHN/GHTK) before real orders ship.
4. **Tax & invoicing** — Is VAT/invoice generation required for Vietnamese customers? *(Still open — not addressed in this re-audit.)*
5. ~~**Discounts scope**~~ — **Answered by implementation**: percent/fixed codes with min order amount, max uses, and expiry are built. Confirm this covers the intended promotions scope, or whether automatic promotions/category sales are still wanted.
6. **Analytics** — What KPIs must the admin dashboard show at launch (revenue, orders, top products, conversion)? *(Still open — a dashboard shell/component exists but no analytics API was found.)*
7. **Guest checkout** — Required, or is account creation mandatory to purchase? *(Still open.)*
8. **Launch market** — Vietnam only at launch, or international shipping/currency from day one? *(Still open; the shipping simulation does branch on domestic vs. international, which may be a signal of intent worth confirming.)*

---

## 9. Acceptance Criteria (launch-readiness, MVP)

The platform is considered launch-ready when:

- A guest can register, verify email, browse, add a variant to cart, check out, and pay with a live Stripe card, resulting in a `paid` order confirmed via webhook.
- Stock decrements correctly on payment and cannot be oversold under concurrent checkout.
- A customer can view order history and receive an order-confirmation email.
- An admin can create a product with variants and publish it; manage categories; and progress an order through to `delivered`.
- All admin routes reject non-admin tokens; all write endpoints validate input.
- **(re-audited, not yet met)** Admin routes reject tokens of the wrong *role* for the action, not just non-admin tokens — currently only `/api/admin/users` enforces role.
- Core GET endpoints are cached and invalidated correctly.
- **(added 2026-08-05)** **Journals:** at least 3 articles are published and reachable at `/blog` and `/blog/{slug}`; a draft article is not reachable by direct slug; view counts increment on the public detail route.
- **(added 2026-08-05)** **Careers:** at least 1 open role is listed at `/careers`; a visitor can submit an application with a **file CV upload** (no account required) and it lands in `/admin/jobs/{id}` as `received`; closed roles reject new applications.
- Discount codes apply correctly at checkout — **built**, not merely in scope.
- **(re-audited, not yet met)** A duplicate/replayed Stripe webhook event does not double-decrement stock, double-send emails, or double-count discount usage.
- **(re-audited, not yet met)** A customer who clicks the email-verification or password-reset link lands on a working page, not a 404.
