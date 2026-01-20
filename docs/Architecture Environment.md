SYSTEM / PROJECT PROMPT

Architecture Enforcement – Medusa v2 (Pola A)

You are working on a Medusa v2.12.5 backend for a self-hosted e-commerce store (Toko Baju Muslim V1).

You MUST follow the architecture rules below strictly.

🧱 Architecture Pattern (MANDATORY)

We use Pattern A: Global Services + Medusa Modules as Adapters

Folder Responsibilities
src/
├─ services/        # GLOBAL, reusable, infra-level logic
├─ modules/         # Medusa-specific adapters & orchestration
├─ workflows/       # Medusa workflows only
├─ api/             # HTTP endpoints only

📌 RULE 1 — src/services (GLOBAL SERVICES)

All external and reusable logic MUST live here.

Allowed in src/services

HTTP clients (Midtrans, RajaOngkir)

Email sender (Gmail SMTP)

Logger

Formatters / mappers

Retry / backoff logic

FORBIDDEN in src/services

❌ Direct Medusa DB access
❌ Inventory mutation
❌ Order/payment state updates
❌ Importing from src/modules

Services must be pure, stateless, reusable, and Medusa-agnostic.

📌 RULE 2 — src/modules/* (MEDUSA ADAPTERS)

Modules are thin adapters between Medusa and global services.

Responsibilities

Implement Medusa provider contracts (payment, fulfillment, notification)

Translate Medusa data → service input

Handle Medusa lifecycle hooks & workflows

Enforce idempotency checks (NOT business logic)

Constraints

Modules MAY import from src/services

Modules MUST NOT re-implement HTTP/email logic

Modules MUST NOT call external APIs directly (always via services)

📌 RULE 3 — Dependency Direction (STRICT)
services → (no dependency on Medusa)
modules  → services
api      → modules / workflows
workflows→ modules / services (read-only helpers)

❌ Circular dependencies are NOT allowed.

📌 RULE 4 — Inventory & Flash Sale Safety

NEVER decrement inventory manually

Use Medusa Inventory Module APIs only

Reservations are “holds”, NOT stock mutations

Commit stock only through official Medusa flows

📌 RULE 5 — Idempotency (MANDATORY)

Idempotency MUST be enforced for:

Checkout / complete cart

Shipment (AWB) generation

Payment webhook handling

📌 RULE 6 — V1 Scope Enforcement

You MUST NOT implement:
❌ Refund logic
❌ COD
❌ Preorder
❌ WhatsApp integration
❌ Marketplace sync

V1 includes ONLY:

Midtrans Snap (create + webhook)

RajaOngkir (Cost Calculation) & Komerce Collaborator (Delivery Booking)

- Note: Delivery uses specific Komerce "Store Order" endpoint.
- Sandbox: Takes prepaid payment from Dashboard Balance (requires TopUp) or supports COD booking (no deduction).

Gmail SMTP notifications

Flash sale protection via inventory reservations

📌 Naming Conventions (MANDATORY)

Providers:

Payment: pp_midtrans

Fulfillment: fp_rajaongkir

Notification: np_gmail

Files:

Services: *-client.ts,*-service.ts

Modules: service.ts, index.ts

📌 Output Expectations

When implementing features, ALWAYS:

Place external logic in src/services

Place Medusa wiring in src/modules

Keep modules thin

Avoid over-engineering V1 features

If unsure, ASK before implementing.

🚦Final Instruction

Follow this architecture strictly. Any deviation is considered a bug.
