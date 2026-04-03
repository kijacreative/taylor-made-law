# CLAUDE.md — Taylor Made Law

## Project Overview

Taylor Made Law is a legal network SaaS platform connecting attorneys for case exchange, collaboration (circles/groups), direct messaging, and mass tort coordination. It has two portals: a **Lawyer Portal** (authenticated attorneys) and an **Admin Portal** (firm staff managing the network). There is also a public-facing marketing site (Home, FindLawyer, Blog, ForLawyers).

**Platform:** Built on [Base44](https://base44.com) — a Backend-as-a-Service (BaaS). The frontend is a standalone React SPA. The backend is 56 Deno-based serverless functions hosted on Base44's infrastructure. The database is Base44's entity system (abstracted ORM, not raw SQL). File storage and core email are Base44-managed services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (SPA)                       │
│  React 18 · React Router · React Query · Tailwind/shadcn   │
│  Vite dev server · @base44/vite-plugin                      │
├─────────────────────────────────────────────────────────────┤
│                     BASE44 SDK (@base44/sdk)                │
│  Auth (token-based) · Entity CRUD · Function invocation     │
│  Real-time subscriptions · File upload                      │
├─────────────────────────────────────────────────────────────┤
│                  BACKEND (base44/functions/)                 │
│  56 Deno serverless functions (TypeScript)                  │
│  Each: Deno.serve() HTTP handler                            │
├──────────┬──────────┬───────────────┬───────────────────────┤
│  Stripe  │  Resend  │  Lead Docket  │  Base44 Core          │
│ Payments │  Email   │  Webhook Sync │  Storage/Email/Auth   │
└──────────┴──────────┴───────────────┴───────────────────────┘
```

### Key Architectural Decisions
- **No traditional backend server** — all server logic lives in Base44 serverless functions
- **Entity-based data model** — no raw SQL; all DB access via `base44.entities.EntityName`
- **Service role escalation** — `base44.asServiceRole.entities.*` bypasses row-level security for admin operations
- **Token-based auth** — tokens passed via URL params, stored in localStorage, validated by Base44 SDK
- **Auto-generated page routing** — `pages.config.js` is auto-generated from `/src/pages/` directory; only `mainPage` is manually editable

---

## Stack Inventory

| Layer | Technology |
|-------|-----------|
| **Frontend framework** | React 18.2 (JSX, no TypeScript in components) |
| **Routing** | react-router-dom 6 |
| **Server state** | @tanstack/react-query 5 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui (new-york style) + custom TML components |
| **Build tool** | Vite 6.1 + @base44/vite-plugin |
| **Package manager** | npm (package-lock.json) |
| **Backend runtime** | Deno (Base44 serverless functions, TypeScript) |
| **Database** | Base44 entity system (abstracted ORM) |
| **Auth** | Base44 SDK auth (token-based, role/status checks) |
| **Payments** | Stripe (checkout sessions, webhooks, subscriptions) |
| **Email** | Resend API + Base44 Core.SendEmail |
| **File storage** | Base44 Core.UploadFile (abstracted) |
| **Lead sync** | Lead Docket webhook integration |
| **Linting** | ESLint 9 (flat config) + unused-imports plugin |
| **Icons** | lucide-react |
| **Charts** | recharts |
| **Forms** | react-hook-form + zod validation |
| **Rich text** | react-quill |
| **Maps** | react-leaflet |
| **Animations** | framer-motion |
| **PDF generation** | jspdf + html2canvas |
| **Drag & drop** | @hello-pangea/dnd |
| **3D** | three.js (used on Home page) |

---

## Key Directories

```
/
├── src/
│   ├── api/base44Client.js      # Base44 SDK initialization
│   ├── lib/
│   │   ├── AuthContext.jsx       # Global auth state (React Context)
│   │   ├── app-params.js         # Runtime config from URL/env/localStorage
│   │   ├── query-client.js       # React Query client config
│   │   ├── NavigationTracker.jsx # Page view tracking
│   │   ├── PageNotFound.jsx      # 404 page
│   │   └── utils.js              # cn() utility (tailwind-merge + clsx)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (48+ components)
│   │   ├── design/               # DesignTokens.jsx (brand constants)
│   │   ├── TML*.jsx              # Custom branded components (TMLButton, TMLCard, etc.)
│   │   ├── AppSidebar.jsx        # Lawyer portal sidebar
│   │   ├── AdminSidebar.jsx      # Admin portal sidebar
│   │   ├── PublicNav.jsx         # Public site header
│   │   └── PublicFooter.jsx      # Public site footer
│   ├── pages/                    # ~50 page components (auto-registered)
│   │   ├── Home.jsx              # Public landing page
│   │   ├── LawyerDashboard.jsx   # Lawyer portal home
│   │   ├── AdminDashboard.jsx    # Admin portal home
│   │   ├── CaseExchange.jsx      # Case marketplace
│   │   ├── FindLawyer.jsx        # Public lead intake form
│   │   ├── Groups.jsx            # Legal circles/groups listing
│   │   └── ...
│   ├── hooks/use-mobile.jsx      # Mobile breakpoint hook
│   ├── utils/index.ts            # createPageUrl() helper
│   ├── pages.config.js           # AUTO-GENERATED — do not edit imports
│   ├── Layout.jsx                # App shell with CSS variables
│   ├── App.jsx                   # Router + AuthProvider + QueryProvider
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Tailwind base + CSS variables
├── base44/functions/             # 56 serverless backend functions
│   ├── stripeWebhook/entry.ts
│   ├── submitCase/entry.ts
│   ├── getCasesForLawyer/entry.ts
│   ├── sendVerificationEmail/entry.ts
│   ├── emailTemplates/entry.ts
│   └── ... (each has entry.ts)
├── taylor-made-law/              # ⚠️  DUPLICATE — older nested clone, should be removed
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── components.json               # shadcn/ui config
├── jsconfig.json
└── index.html
```

---

## Local Run Instructions

### Prerequisites
- Node.js 18+
- npm

### Install & Dev Server
```bash
npm install
npm run dev
```

### Environment Variables (required in `.env`)
```bash
VITE_BASE44_APP_ID=<your-base44-app-id>
VITE_BASE44_FUNCTIONS_VERSION=<version>
VITE_BASE44_APP_BASE_URL=<base44-app-url>
```

### Backend Functions
Backend functions run on Base44's infrastructure (Deno runtime). They are **not runnable locally** without the Base44 platform. They are deployed/managed through the Base44 dashboard.

Server-side env vars (set in Base44 dashboard, not in local `.env`):
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
APP_URL
```

---

## Build / Test / Lint Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build (vite build)
npm run preview      # Preview production build
npm run lint         # ESLint (quiet mode)
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript check via jsconfig.json
```

> **Note:** There is no test framework configured (no Jest, Vitest, or Playwright).

---

## Coding Conventions

### Observed Patterns
- **File naming:** PascalCase for pages and components (e.g., `LawyerDashboard.jsx`, `TMLButton.jsx`)
- **Component files:** `.jsx` extension (not `.tsx`); TypeScript used only in `src/utils/index.ts`
- **Backend functions:** TypeScript `.ts` in `base44/functions/*/entry.ts`
- **Imports:** Path aliases via `@/` (maps to `src/`) — e.g., `@/components/ui/button`
- **State management:** React Context for auth; React Query for server state; useState for local
- **Data fetching:** `useQuery` with `base44.entities.X.filter()` or `base44.functions.invoke()`
- **Real-time:** `base44.entities.X.subscribe(callback)` in useEffect with cleanup
- **Styling:** Tailwind utility classes; `cn()` helper for conditional classes
- **Custom components:** TML-prefixed brand components wrap shadcn primitives
- **shadcn/ui style:** new-york variant, no RSC, no TSX, lucide icons
- **ESLint rules:** Unused imports are errors; unused vars are warnings (underscore-prefixed ignored); prop-types disabled; react-in-jsx-scope disabled
- **Email normalization:** Always `.toLowerCase().trim()` on email inputs
- **Audit logging:** State-changing backend operations create AuditLog records (fire-and-forget)
- **Error responses:** JSON bodies with HTTP status codes (400/401/403/404/409/500)
- **Role checks:** `user.role === 'admin'` for admin gates; `user.user_status === 'approved'` for lawyer gates; `user.membership_status === 'paid'` for paid features
- **pages.config.js:** AUTO-GENERATED — never manually add imports; only edit `mainPage`

### Design Tokens (Brand)
```
Primary:    #3a164d (dark purple)
Accent:     #a47864 (copper/tan)
Background: #faf8f5 (cream)
Text:       #333333 / #666666 / #999999
Font:       Inter (system-ui fallback)
```

---

## Third-Party Services & External Dependencies

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Base44** | BaaS (DB, auth, file storage, functions hosting) | SDK client, vite plugin, all backend functions |
| **Stripe** | Subscriptions & payments | `stripeWebhook`, `createSubscriptionCheckout`, `createSetupIntent` |
| **Resend** | Transactional email | Multiple backend functions via API |
| **Lead Docket** | Lead/case management sync | Webhook POST from `FindLawyer.jsx` to `taylormadelaw.leaddocket.com` |
| **WordPress** | Legacy media hosting | Hardcoded image URLs from `taylormadelaw.com/wp-content/uploads/` |

---

## Core Entities (Data Model)

| Entity | Purpose |
|--------|---------|
| User | Core user records (email, role, status, stripe_customer_id) |
| LawyerProfile | Attorney profiles (firm, bar number, practice areas, subscription) |
| Case | Case marketplace listings (title, state, practice_area, status) |
| Lead | Inbound client leads from FindLawyer form |
| LawyerApplication | Attorney registration applications |
| LegalCircle | Collaboration groups |
| LegalCircleMember | Circle membership records |
| LegalCircleCase | Cases submitted within circles |
| DirectMessageThread | Messaging threads between attorneys |
| DirectMessage | Individual messages |
| DirectMessageFile | File attachments in messages |
| DirectMessageParticipant | Thread participants with read tracking |
| CircleDocument / DocumentVersion | Shared documents with versioning |
| ActivationToken | Invite/activation codes (hashed) |
| EmailVerificationOtp | Email verification codes (hashed) |
| ConsentLog | User consent tracking |
| AuditLog | System audit trail |
| Invitation / LegalCircleInvitation | Circle invite records |

---

## Auth Flow

**Token lifecycle:** Base44 issues opaque tokens → passed via URL param `?access_token=` → stored in `localStorage` as `base44_access_token` → attached to SDK requests → validated server-side by Base44. The frontend never decodes or validates tokens.

**Login paths:**
- **Lawyer:** `LawyerLogin.jsx` or `LawyerPortalLogin.jsx` → `base44.auth.loginViaEmailPassword()` → role/status checks → redirect to dashboard or onboarding
- **Admin:** `AdminLogin.jsx` → `base44.auth.redirectToLogin()` → OTP via `base44.auth.verifyOtp()` → admin role check → redirect to AdminDashboard
- **Signup:** Three variants (`ForLawyers`, `JoinNetwork`, `JoinLawyerNetwork`) → backend creates LawyerApplication → admin reviews → activation email → password set

**Role model:**
- `user.role`: `'admin'` | `'user'` (primary gate)
- `user.user_type`: `'admin'` | `'senior_associate'` | `'junior_associate'` | `null` (admin tier)
- `user.user_status`: `'invited'` → `'pending'` → `'approved'` → `'disabled'` (lifecycle)
- `user.membership_status`: `'paid'` | `'trial'` | `'none'` (subscription gate for case acceptance)

**Route protection:** No middleware or route guards in the router. Each page checks auth in its own `useEffect` and redirects if unauthorized. Server-side functions check `base44.auth.me()` and role/status independently.

**Token types (backend):** ActivationToken (SHA-256, 7-day), EmailVerificationOtp (SHA-256, 10-min, rate-limited 5/hr), AttorneyInvitation (SHA-256, 7-day). All stored as hashes, never raw.

---

## Database Dependencies

**No traditional database.** Base44's entity system is the only data store. No SQL, no schema files, no migrations, no connection strings exist in the repo.

**Access patterns:**
- `base44.entities.X.filter/list/create/update/delete()` — user-scoped (RLS enforced)
- `base44.asServiceRole.entities.X.*` — admin-scoped (bypasses RLS)
- `base44.entities.X.subscribe(callback)` — real-time (4 entities)

**31 entities identified** by reverse-engineering property access across all frontend pages and backend functions. All field schemas are **inferred, not declared** — no schema source of truth exists outside the Base44 dashboard.

**Key relationships:**
- User ↔ LawyerProfile: 1:1 via `user_id` FK
- User ↔ LawyerApplication: linked by `email` match (no FK — schema weakness)
- LegalCircle → LegalCircleMember/Case/Invitation/Message/File/Document: all via `circle_id`
- DirectMessageThread → DirectMessage/Participant/File: all via `thread_id`
- CircleDocument → DocumentVersion/Signature: via `document_id`

**Known schema weaknesses:**
- User/LawyerProfile duplicate ~10 fields (name, firm, phone, bar_number, subscription_status, etc.)
- AuditLog linked by `actor_email` not `actor_id` — breaks if email changes
- No foreign key constraints (orphan records possible)
- Status tracked in 3 overlapping fields (`user_status`, `membership_status`, `subscription_status`)
- Arrays (states_licensed, practice_areas, tags) stored as JSON — not indexable

---

## File Storage Dependencies

**All file uploads go through `base44.integrations.Core.UploadFile({ file })`** — an opaque Base44 service that returns `{ file_url }`. The URL is permanent, public (no auth gate), and persists even after soft-deletion.

**Frontend upload call sites (5):**
1. `LawyerOnboarding.jsx` — profile photo → `User.profile_photo_url`
2. `AdminBlogEdit.jsx` — featured image / PDF → `BlogPost.featured_image_url`
3. `AdminResourceEdit.jsx` — resource file / PDF → `Resource.file_url`
4. `AdminPopupEdit.jsx` — popup image → `Popup.image_url`
5. Rich text editor (inline) — blog body images → embedded in `BlogPost.body` HTML

**Backend upload functions (4):**
1. `uploadDirectMessageFile` → `DirectMessageFile` entity
2. `uploadCircleFile` → `CircleFile` entity
3. `uploadCircleDocument` → `CircleDocument` + `DocumentVersion`
4. `createDocumentVersion` → new `DocumentVersion`

**Deletion:** Soft-delete only (`is_deleted: true`). File URL remains accessible. No server-side file type or size validation.

**Static assets:** 25+ WordPress image URLs hardcoded across 12+ files (`taylormadelaw.com/wp-content/uploads/`). If WordPress goes down, all logos and hero images break.

---

## Messaging & Real-time Dependencies

**4 real-time subscriptions** (via `base44.entities.X.subscribe(callback)`):

| Entity | Used In | Event Types | Purpose |
|--------|---------|-------------|---------|
| DirectMessage | DirectMessageThread, DirectMessages, AppSidebar | create, update | New messages, edits, deletes |
| DirectMessageParticipant | AppSidebar | update | Read receipt → refresh unread count |
| CircleMessage | CircleChat | create, update, delete | Group chat real-time |
| CircleNotification | NotificationBell | create, update, delete | In-app notification badge |

**Polling fallbacks:**
- `getDirectInbox` — 8-second interval (DirectMessages.jsx)
- `CircleFile.filter` — 15-second interval (CircleResources.jsx)
- `CircleDocument.filter` — 10-second interval (CircleDocuments.jsx)

**Unread algorithm:** `isUnread = lastMsgAt exists AND sender ≠ me AND (never read OR lastMsgAt > lastReadAt)`. Tracked via `DirectMessageParticipant.last_read_at`.

**Protocol:** Unknown — Base44 SDK abstracts whether it uses WebSocket, SSE, or long-polling. The subscription API is `subscribe(callback)` → returns unsubscribe function.

---

## Migration Risks (Local-First)

### High Risk
1. **Total Base44 platform dependency** — Auth, database, file storage, serverless functions, real-time subscriptions, and the vite plugin all depend on Base44. There is no local database, no local auth server, and no way to run backend functions locally.
2. **No API abstraction layer** — `base44.entities.*` and `base44.functions.invoke()` calls are scattered directly in 50+ page components. Migration requires replacing every call site.
3. **Entity system ≠ SQL** — The Base44 entity ORM (.filter(), .list(), .create(), .update()) has no schema files, no migrations. The data model exists only in the Base44 dashboard. Schema must be reverse-engineered from usage.

### Medium Risk
4. **Stripe webhook routing** — Currently routed through Base44's function hosting. Needs a new webhook endpoint on whatever replaces it.
5. **Real-time subscriptions** — `base44.entities.X.subscribe()` used for live DM updates. Needs WebSocket or SSE replacement.
6. **File upload** — `Base44 Core.UploadFile` abstracts storage. Needs S3/local storage replacement.
7. **Email delivery** — Dual system (Resend + Base44 Core.SendEmail). Resend can be kept; Base44 email calls need replacement.
8. **pages.config.js auto-generation** — Managed by `@base44/vite-plugin`. Post-migration, this must be either manually maintained or replaced with a custom Vite plugin / file-system router.

### Low Risk
9. **Duplicate nested repo** — `/taylor-made-law/` inside the project root appears to be an older clone with its own `.git`, `package.json`. Should be removed.
10. **Hardcoded WordPress URLs** — Image assets reference `taylormadelaw.com/wp-content/uploads/`. Should be migrated to self-hosted assets.
11. **Hardcoded Lead Docket URL** — `FindLawyer.jsx` POSTs directly to `taylormadelaw.leaddocket.com`.
12. **Hardcoded Stripe price ID** — `price_1TCqcIBI0mAZLD5som54aFFB` in `createSubscriptionCheckout`.

---

## Unknowns Requiring Investigation

1. **Base44 entity schemas** — No schema definitions exist in code. Full field definitions, types, constraints, and indexes must be exported from the Base44 dashboard before migration.
2. **Base44 vite plugin behavior** — `@base44/vite-plugin` handles page auto-registration, HMR notifications, navigation tracking, and visual edit agent. Its exact transformations are unknown (closed-source plugin).
3. **Deployment pipeline** — No CI/CD config, no Dockerfile, no deployment scripts in repo. Deployment is likely managed entirely through Base44's platform.
4. **Data volume** — Unknown number of users, cases, messages, etc. Affects migration tooling choices and database sizing.
5. **Base44 SDK internals** — `createAxiosClient` from `@base44/sdk/dist/utils/axios-client` is used directly. SDK internals may have undocumented behaviors.
6. **Row-level security rules** — RLS policies exist in Base44 but are not visible in code. Must be documented before migration.
7. **Real-time subscription protocol** — Whether Base44 uses WebSockets, SSE, or polling under the hood.
8. **Environment/staging setup** — Whether there are separate Base44 environments (dev/staging/prod).
9. ~~**Suspicious files at project root**~~ — **RESOLVED.** SSH keys were local-only (never committed to git). Deleted and added to `.gitignore`.

---

## Migration Goals

- Convert the platform into a stable local-first development workflow managed through Claude Code Desktop
- Preserve current production behavior where possible
- Reduce hidden dependencies and undocumented setup
- Make all core flows testable locally

## Working Style

- Audit before changing
- Prefer small reversible commits
- Update this file when architecture becomes clearer
- Flag unknowns explicitly
- Do not silently remove legacy dependencies without documenting impact

## Priority Areas (in order)

1. Onboarding flows
2. Directory / search
3. Find-a-lawyer matching flow
4. Lawyer application flow
5. Messaging
6. Circles
7. File / resource sharing
8. Admin controls

## Local Development

Two modes are available (see `LOCAL_DEV.md` for full details):

```bash
npm run dev:local   # Mock mode — no Base44 credentials needed
npm run dev         # Live mode — connects to real Base44 backend
```

Mock mode uses `src/api/base44MockClient.js` (Proxy-based stub for all entities, functions, auth). Toggled via `VITE_USE_MOCKS=true` in `.env` or the `dev:local` script.

## Service Layer (completed)

All 70 page/component files now import from `src/services/` instead of `base44Client` directly. Only 2 infrastructure files retain the `base44` import: `AuthContext.jsx` and `NavigationTracker.jsx`.

Services: `auth`, `lawyers`, `cases`, `circles`, `messaging`, `content`, `notifications`, `admin`, `storage`, `onboarding` (+ barrel `index.js`).

## Supabase Foundation (connected, first domain live)

PostgreSQL schema in `supabase/migrations/` (10 files, 27 tables). Supabase Auth + `profiles` table pattern. RLS policies (fixed for recursion via `is_admin()` SECURITY DEFINER function), storage buckets (`avatars`, `documents`, `content`), Realtime on 4 messaging tables. Seed data in `supabase/seed.sql`. See `docs/migration/supabase-foundation.md` for full details.

**Provider flags (7 domains wired):** Each domain switchable between `base44` and `supabase` via env vars. Instant rollback by setting back to `base44`.

| Flag | Domain | Status |
|------|--------|--------|
| `VITE_PROVIDER_CONTENT_READ` | Blog, content, resources, mass torts | Live with seed data |
| `VITE_PROVIDER_PROFILE_READ` | Lawyer profiles | Wired |
| `VITE_PROVIDER_CASES_READ` | Cases, leads | Wired |
| `VITE_PROVIDER_CIRCLES_READ` | Circles, members, invitations | Wired |
| `VITE_PROVIDER_MESSAGING_READ` | DM reads (no switchable reads — all backend functions) | Registered |
| `VITE_PROVIDER_AUTH` | Login, logout, session, OTP, password reset | Wired (dual-provider in AuthContext + services/auth) |

**Edge Functions (6 implemented, 3,244 lines):** `cases`, `messaging`, `circles`, `stripe`, `auth-signup`, `admin-lawyers` — all in `supabase/functions/`. Not yet wired to frontend service layer.

**Auth cutover:** `AuthContext.jsx` and `services/auth.js` support dual providers. When `VITE_PROVIDER_AUTH=supabase`: Supabase `getSession()` + `onAuthStateChange()` replaces Base44 token management. User object shape preserved by merging `auth.getUser()` + `profiles` query.

## Resolved Issues Log

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-04-02 | SSH keys at project root | Deleted, added to .gitignore. Never committed to git. |
| 2026-04-02 | Top-level `await` in base44Client.js broke production build | Replaced with static import + conditional assignment. |
| 2026-04-02 | NavigationTracker crash (mock `appLogs.logUserInApp` returned non-Promise) | Changed to `async` function in mock client. |
| 2026-04-02 | No `.env.example` or local dev docs | Created `.env.example`, `LOCAL_DEV.md`, `scripts/setup.sh`, `dev:local` script. |
