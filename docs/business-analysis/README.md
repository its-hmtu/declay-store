# Declay Store — Business Analysis

Business-analysis deliverables for Declay Store, an e-commerce platform for handmade figures. Prepared for a **real product build**, grounded in an audit of the actual codebase (not just documented intent).

## Documents

| # | Document | What's inside |
|---|----------|---------------|
| 01 | [Requirements (BRD / SRS)](./01-requirements-brd-srs.md) | Business goals, stakeholders/actors, business requirements, functional requirements (with build status), non-functional requirements, assumptions, open questions, acceptance criteria. |
| 02 | [Diagrams](./02-diagrams.md) | System context, container/deployment, use case, ERD, sequence flows (checkout, registration, fulfillment, AI), order state machine, module map. Mermaid. |
| 03 | [System Design](./03-system-design.md) | Architecture, request lifecycle, auth model, data/persistence, API surface, integrations (Stripe, OAuth, email, Claude), frontend, NFR decisions, risks, target architecture. |
| 04 | [Backlog, Roadmap & Gap Analysis](./04-feature-backlog-roadmap-gap-analysis.md) | Documented-vs-actual gap table, epics & user stories, phased roadmap, prioritization, immediate next actions. |

## How to read these

- Viewing Mermaid diagrams: open in GitHub, or VS Code with a Mermaid preview extension. Most modern Markdown viewers render the ```mermaid``` blocks.
- Status legend used throughout: ✅ Built & wired · 🟡 Partial / scaffolded · 🔴 Not started.

## Headline findings

**Updated 2026-07-07 re-audit:** the commerce core (catalogue → cart → Stripe checkout → order lifecycle → webhook confirmation) remains built and wired. Since the 2026-06-19 audit, ~19 days of uncommitted engineering work has closed most of the previously-open gaps: the AI chatbot and admin AI assistant (tool-use, with a working confirmation gate), discount codes, banners, site settings, admin-user management, image upload, shipment tracking endpoints, and real BullMQ-backed transactional emails are all now built and route-wired. See document 04, Section 0 for the full list.

This progress surfaced **new risks that didn't exist in the original audit**: Stripe webhook idempotency is still missing and now has a larger blast radius (double stock decrement, double email, double fulfillment-pipeline trigger, double discount usage count on any duplicate webhook); order fulfillment (`processing → shipped → delivered`) is now a fully automated simulation with a fabricated carrier/tracking number and no real carrier integration or admin step, which needs explicit product-owner sign-off before real orders ship; role-based access control (`requireRole`) is implemented but wired to only one of ~15 admin routers, so `editor` accounts can currently perform destructive/financial actions (including via the AI assistant) that the BRD says they shouldn't; and email verification / password reset are fully built on the backend but have no frontend page to land on.

## Top priorities

See document 04, Section 5 (revised 2026-07-07). In short: (1) fix webhook idempotency / stock double-decrement — now the single highest-risk item; (2) get product-owner sign-off on the automated fulfillment simulation; (3) ship the two missing auth frontend pages; (4) apply the existing role-enforcement guard beyond admin-user management; (5) move image/CV storage off local disk; (6) add rate limiting + a real audit log for the AI assistant; (7) stand up tests.

## Open questions for the product owner

Document 01, Section 8 (revised 2026-07-07): two of the original eight questions (AI priority/budget, image/file storage) have been **answered by implementation rather than by decision** and need explicit confirmation that the implicit choice matches business intent; the shipping-model question now needs sign-off on a specific simulated approach rather than a decision from scratch. Five questions remain fully open (tax/invoicing, analytics KPIs, guest checkout, launch market, and confirming discount scope).

---

*Prepared 2026-06-19; re-audited against the actual codebase 2026-07-07. These documents are the English, build-oriented source of truth; the Vietnamese `Bao-cao-*` / `PTTK-*` files in the repo root are prior project reports.*
