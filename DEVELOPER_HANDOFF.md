# Developer Handoff

> Last updated: 2026-04-03

## Current Status

The platform is mid-migration from Base44 (Backend-as-a-Service) to Supabase (self-hosted PostgreSQL + Auth + Storage + Edge Functions). The migration is designed to be incremental — each domain can be switched independently via environment variable flags.

### What's Complete

| Phase | Status | Details |
|-------|--------|---------|
| **Base44 dependency audit** | ✅ Done | `docs/migration/base44-audit.md` — 72 files, 237+ entity calls, 37 backend functions |
| **Service abstraction layer** | ✅ Done | 12 service modules in `src/services/`. 70 of 72 UI files migrated from direct Base44 imports. |
| **Supabase schema** | ✅ Done | 10 migrations, 27 tables, 97 RLS policies, 3 storage buckets, seed data |
| **Edge Functions** | ✅ Done | 6 functions (3,244 lines) replacing 28 Base44 backend functions |
| **Auth cutover** | ✅ Done | Dual-provider in AuthContext + services/auth. Flag-controlled. |
| **Provider flags (reads)** | ✅ Done | 7 domains wired: content_read, profile_read, cases_read, circles_read, messaging_read, auth |
| **Data migration pipeline** | ✅ Done | Export → identity map → transform → import → verify scripts |
| **Migration documentation** | ✅ Done | 10 docs in `docs/migration/` |
| **QA plan** | ✅ Done | 99 tests across 7 categories |
| **Decommission checklist** | ✅ Done | 7-phase plan with rollback triggers |
| **Git + staging workflow** | ✅ Done | main (stable) + staging (beta) branches |

### What's In Progress

| Item | Status | What Remains |
|------|--------|-------------|
| **Write operations on Supabase** | Not started | Services still use Base44 for creates/updates/deletes. Need provider flags for write paths. |
| **Edge Function wiring** | Not started | Functions are implemented but not invoked from frontend services yet. Need provider flags for `functions.invoke` calls. |
| **Supabase Realtime** | Not started | 4 subscriptions (DirectMessage, DirectMessageParticipant, CircleMessage, CircleNotification) still use Base44 mock. Need Supabase Realtime channel wiring. |
| **Storage migration** | Not started | File uploads still use Base44 `Core.UploadFile`. Need to wire `services/storage.js` to Supabase Storage buckets. |
| **End-to-end auth testing** | Partial | Auth flag works, but no real Supabase user login tested yet (need to create test user via Supabase Studio). |

### What's Not Started

- Postgres RPC functions (10 functions classified in `docs/migration/backend-migration.md`)
- Production Supabase project setup (currently local only)
- CI/CD pipeline
- Automated testing (no test framework exists)
- WordPress asset migration (25+ hardcoded image URLs)
- Lead Docket webhook migration
- Base44 decommission (requires all above complete first)

## Working Features (Mock Mode)

These work when running `npm run dev:local`:

| Feature | Route | Status |
|---------|-------|--------|
| Home page | `/` | ✅ Renders with hero, CTAs |
| Find a Lawyer form | `/FindLawyer` | ✅ Multi-step form renders |
| Public blog | `/Blog` | ✅ Renders (from Supabase when flag set) |
| Attorney signup | `/ForLawyers`, `/JoinNetwork` | ✅ Forms render |
| Lawyer dashboard | `/LawyerDashboard` | ✅ Mock user, stats cards |
| Admin dashboard | `/AdminDashboard` | ✅ Mock user, all nav items |
| Case exchange | `/CaseExchange` | ✅ Empty state (mock returns []) |
| Direct messages | `/app/messages` | ✅ Empty inbox |
| Legal circles | `/Groups` | ✅ Empty state + create button |
| All admin pages | `/Admin*` | ✅ Render with empty data |

## Working Features (Supabase Mode)

These work when `VITE_PROVIDER_CONTENT_READ=supabase`:

| Feature | Status |
|---------|--------|
| Blog posts from PostgreSQL | ✅ 3 published posts render with images, categories, dates |
| Content filtering by category | ✅ Works against Supabase data |
| RLS public access (anon key reads published content) | ✅ Verified |
| Mixed providers (content from Supabase, auth from Base44 mock) | ✅ Works simultaneously |

## Known Issues

### Bugs

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | `ForgotPassword.jsx` generates reset tokens client-side with `Math.random()` — predictable | **Security** | ForgotPassword.jsx:20 |
| 2 | Footer legal links are dead `<span>` elements (not clickable) | Low | PublicFooter.jsx:56-62 |
| 3 | `AdminNetworkReview` approve has race condition (invite then update, no transaction) | Medium | AdminNetworkReview.jsx:93-125 |
| 4 | Silent email delivery failures (console.log instead of user feedback) | Medium | AdminLeadDetail.jsx:225,330 |

### Tech Debt

| # | Issue | Location |
|---|-------|----------|
| 1 | 20+ `console.log` statements in production code | Multiple admin pages |
| 2 | 10+ pages use `window.location.search` instead of `useSearchParams` | Admin detail pages |
| 3 | Hardcoded route strings instead of `createPageUrl()` in 15+ files | LawyerPortalLogin, DirectMessages, etc. |
| 4 | `LawyerSettings.jsx` (800+ lines) and `AdminLawyers.jsx` (900+ lines) need decomposition | These two files |
| 5 | No error boundaries — component crash takes down entire page | App-wide |
| 6 | 89 ESLint unused-import errors | `npm run lint` to see |
| 7 | Duplicate nested repo `taylor-made-law/` at project root (gitignored but still on disk) | Root directory |

### Schema Weaknesses (inherited from Base44)

- User/LawyerProfile duplicate ~10 fields (name, firm, phone, etc.)
- AuditLog linked by `actor_email` not `actor_id` (partially fixed in Supabase schema)
- 3 overlapping status fields: `user_status`, `membership_status`, `subscription_status`
- `is_deleted` boolean (Base44) vs `deleted_at` timestamp (Supabase) — transformation handled in migration pipeline

## Next Priorities

### Immediate (to complete migration)

1. **Wire Edge Functions to frontend** — add provider flags for `functions.invoke` calls in each service, routing to `supabase.functions.invoke('cases', { body: { action: 'list' } })` when flag is `supabase`
2. **Wire write operations** — add Supabase paths for `createCase`, `updateCase`, etc. in services
3. **Wire Supabase Realtime** — replace `base44.entities.X.subscribe()` with Supabase channel subscriptions in messaging + notifications services
4. **Wire storage** — replace `Core.UploadFile` in `services/storage.js` with `supabase.storage.from(bucket).upload()`
5. **Create test Supabase user** — use Supabase Studio to create a test user, then test full auth flow with `VITE_PROVIDER_AUTH=supabase`

### Short-term (production readiness)

6. **Create hosted Supabase project** — migrate from local Docker to Supabase cloud
7. **Set Supabase secrets** — `supabase secrets set RESEND_API_KEY=... STRIPE_SECRET_KEY=...`
8. **Deploy Edge Functions** — `supabase functions deploy`
9. **Run data migration** — `bash scripts/migration/run-migration.sh all`
10. **Execute QA plan** — 99 tests in `docs/migration/qa-plan.md`

### Medium-term (post-migration)

11. **Remove Base44 SDK** — follow `docs/migration/decommission-checklist.md`
12. **Add test framework** (Vitest recommended)
13. **Fix punch list items** — security bugs, tech debt (see Known Issues above)
14. **Set up CI/CD** — GitHub Actions for lint, build, deploy
15. **Migrate WordPress assets** — self-host the 25+ hardcoded image URLs

## Key Files for New Developers

| File | What to read first |
|------|-------------------|
| `CLAUDE.md` | Architecture, stack, conventions — the single source of truth |
| `LOCAL_DEV.md` | How to run locally in mock and Supabase modes |
| `src/services/provider.js` | How the dual-provider feature flag system works |
| `src/services/auth.js` | How auth switches between Base44 and Supabase |
| `src/lib/AuthContext.jsx` | Session management (the app's auth backbone) |
| `supabase/seed.sql` | What test data exists in local Supabase |
| `docs/migration/base44-audit.md` | Where every Base44 dependency lives |
| `docs/migration/qa-plan.md` | How to verify the migration is correct |

## Environment Setup Checklist

- [ ] Clone repo: `git clone git@github.com:kijacreative/taylor-made-law.git`
- [ ] Run setup: `bash scripts/setup.sh`
- [ ] Verify mock mode: `npm run dev:local` → http://localhost:5173
- [ ] Install Docker Desktop (for Supabase mode)
- [ ] Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- [ ] Start Supabase: `npx supabase start`
- [ ] Seed database: `npx supabase db reset`
- [ ] Test Supabase mode: set `VITE_PROVIDER_CONTENT_READ=supabase` in `.env`, restart dev server
