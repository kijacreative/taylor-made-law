# Taylor Made Law

Legal network SaaS platform connecting attorneys for case exchange, collaboration (circles/groups), direct messaging, and mass tort coordination.

**Two portals:**
- **Lawyer Portal** — authenticated attorneys browse cases, message peers, join circles
- **Admin Portal** — firm staff manage leads, cases, attorneys, content

**Public site:** Home, FindLawyer (client intake), Blog, ForLawyers (attorney signup)

## Quick Start

```bash
# 1. One-command setup (installs deps, creates .env)
bash scripts/setup.sh

# 2. Start in mock mode (no backend credentials needed)
npm run dev:local

# 3. Open in browser
open http://localhost:5173
```

## Development Modes

| Mode | Command | Backend | Auth | When to use |
|------|---------|---------|------|-------------|
| **Mock** | `npm run dev:local` | Base44 mock stubs | Mock admin user | UI development, no Docker needed |
| **Supabase** | `npm run dev` | Local Supabase (Docker) | Supabase Auth | Integration testing, migration work |

### Supabase Mode (requires Docker)

```bash
# Start local Supabase stack
npx supabase start

# Copy anon key from output to .env:
#   VITE_SUPABASE_URL=http://127.0.0.1:54321
#   VITE_SUPABASE_ANON_KEY=<key>

# Apply migrations + seed data
npx supabase db reset

# Open Supabase Studio
open http://127.0.0.1:54323
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, React Query 5, Tailwind CSS, shadcn/ui |
| Build | Vite 6 |
| Database | Supabase (PostgreSQL) — 27 tables, 10 migrations |
| Auth | Supabase Auth (JWT, email/password, OTP) |
| Storage | Supabase Storage (3 buckets: avatars, documents, content) |
| Backend | Supabase Edge Functions (6 functions, 3,244 lines TypeScript) |
| Email | Resend API |
| Payments | Stripe (subscriptions, webhooks) |
| Package manager | npm |

## Project Structure

```
src/
  api/              # SDK clients (Base44, Supabase, mock)
  services/         # Service layer (12 modules abstracting all backend calls)
  lib/              # AuthContext, utilities, NavigationTracker
  pages/            # ~50 page components
  components/       # UI components (shadcn + TML custom)
  hooks/            # Custom React hooks
supabase/
  migrations/       # 10 SQL migration files (schema + RLS)
  functions/        # 6 Edge Functions + shared utilities
  seed.sql          # Local development seed data
  config.toml       # Supabase CLI config
scripts/
  migration/        # Data migration pipeline (export/transform/import/verify)
  setup.sh          # Local setup script
docs/
  migration/        # 10 migration planning documents
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:local` | Start in mock mode (no backend) |
| `npm run dev` | Start with live backend |
| `npm run build` | Production build |
| `npm run lint` | ESLint (quiet mode) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npx supabase start` | Start local Supabase (Docker) |
| `npx supabase db reset` | Reset DB + apply migrations + seed |
| `npx supabase stop` | Stop local Supabase |

## Environment Variables

Copy `.env.example` to `.env`. See `LOCAL_DEV.md` for full details.

Key variables:
- `VITE_USE_MOCKS` — `true` for mock mode, `false` for live
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase connection
- `VITE_PROVIDER_*` — feature flags controlling which backend serves each domain

## Documentation

| Document | Contents |
|----------|----------|
| `CLAUDE.md` | Architecture, coding conventions, migration status, working agreements |
| `LOCAL_DEV.md` | Local development guide (mock mode, Supabase mode, troubleshooting) |
| `DEVELOPER_HANDOFF.md` | Current status, known issues, next priorities |
| `docs/migration/` | 10 migration planning docs (audit, domain model, auth, data pipeline, QA, decommission) |
