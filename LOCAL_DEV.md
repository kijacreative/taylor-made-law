# Local Development Guide — Taylor Made Law

## Quick Start

```bash
# 1. Setup (installs deps, creates .env)
bash scripts/setup.sh

# 2. Start in mock mode (no Base44 credentials needed)
npm run dev:local

# 3. Open http://localhost:5173
```

---

## Two Development Modes

### Mock Mode (`npm run dev:local`)

Runs the full frontend SPA with a mock Base44 SDK client. All entity queries return empty arrays, function invocations return success stubs, and auth returns a mock admin+lawyer user. Both the Lawyer Portal and Admin Portal are accessible.

**When to use:** Frontend development, UI changes, styling, new page layouts, component work.

**What works:**
- All pages render without errors
- Navigation between all routes
- UI components, forms, modals
- Mock user is logged in as an admin+lawyer (both portals accessible)
- Console shows `[MOCK]` prefixed logs for every SDK call

**What does NOT work:**
- No real data (entities return empty arrays)
- No real authentication (always logged in as mock user)
- No email delivery
- No Stripe payments
- No file uploads (returns mock URLs)
- No real-time subscriptions (no-op)
- No Lead Docket webhook sync

### Live Mode (`npm run dev`)

Connects to the real Base44 backend. Requires valid credentials in `.env`.

**When to use:** Integration testing, debugging production issues, testing real data flows.

**Required `.env` values:**
```bash
VITE_USE_MOCKS=false
VITE_BASE44_APP_ID=<from Base44 dashboard>
VITE_BASE44_FUNCTIONS_VERSION=<from Base44 dashboard>
VITE_BASE44_APP_BASE_URL=<from Base44 dashboard>
```

---

## Environment Variables

| Variable | Required For | Where to Find |
|----------|-------------|---------------|
| `VITE_USE_MOCKS` | Both modes | Set `true` for mock, `false` for live |
| `VITE_BASE44_APP_ID` | Live mode | Base44 dashboard → App Settings |
| `VITE_BASE44_FUNCTIONS_VERSION` | Live mode | Base44 dashboard → Deployments |
| `VITE_BASE44_APP_BASE_URL` | Live mode | Base44 dashboard → App URL |

Backend-only variables (set in Base44 dashboard, NOT locally):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `APP_URL`, `BASE44_APP_ID`

---

## Cloud-Only Services (Cannot Run Locally)

| Service | What It Does | Local Behavior |
|---------|-------------|----------------|
| **Base44 Backend Functions** (56 Deno functions) | Server-side business logic | Mock stubs return success |
| **Base44 Entity Database** | All data storage | Mock returns empty arrays |
| **Base44 Auth** | Token-based authentication | Mock user auto-authenticated |
| **Base44 Real-time Subscriptions** | Live DM/notification updates | No-op (subscribe returns unsubscribe fn) |
| **Base44 Core.UploadFile** | File storage | Returns mock URL string |
| **Stripe** | Payment processing | Checkout returns `#mock-checkout` URL |
| **Resend** | Transactional email | No-op (logged to console) |
| **Lead Docket** | Lead sync webhook | fetch() silently fails (wrapped in try/catch) |

---

## Project Structure

```
src/
  api/
    base44Client.js       # SDK client (auto-switches to mock when VITE_USE_MOCKS=true)
    base44MockClient.js   # Mock SDK implementation (Proxy-based)
  lib/
    AuthContext.jsx        # Auth provider (short-circuits in mock mode)
    app-params.js          # Reads env vars + URL params + localStorage
  pages/                   # ~50 page components
  components/              # UI components (shadcn + TML custom)
base44/functions/          # 56 backend functions (Deno, cloud-only)
scripts/
  setup.sh                 # One-command local setup
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:local` | Start Vite dev server in mock mode |
| `npm run dev` | Start Vite dev server in live mode |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (quiet mode) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript check |

---

## Troubleshooting

### App shows blank white screen
- Check browser console for errors
- Verify `VITE_USE_MOCKS=true` is set in `.env` (or use `npm run dev:local`)
- Run `npm install` if you see module resolution errors

### "createClient is not a function" or SDK import errors
- Run `npm install` to ensure `@base44/sdk` is installed
- In mock mode, the SDK import is skipped entirely — this error only occurs in live mode

### Pages show empty content
- Expected in mock mode. Entity queries return `[]` by default.
- To add seed data, edit `SEED_DATA` in `src/api/base44MockClient.js`

### Auth redirect loop
- In mock mode, the mock user is always authenticated — no redirects should occur
- In live mode, ensure `VITE_BASE44_APP_ID` and other credentials are correct

### Console shows [MOCK] everywhere
- Expected behavior. Every SDK call logs with `[MOCK]` prefix in mock mode.
- This confirms the mock is working correctly.

### Vite fails to start
- Ensure Node.js 18+ is installed: `node -v`
- Delete `node_modules` and `package-lock.json`, then run `npm install`

---

## Adding Mock Seed Data

To make pages show realistic data in mock mode, edit the `SEED_DATA` object in `src/api/base44MockClient.js`:

```javascript
const SEED_DATA = {
  LawyerProfile: [MOCK_LAWYER_PROFILE],
  User: [MOCK_USER],
  // Add more entities here:
  Case: [
    { id: 'case-1', title: 'Mock PI Case', state: 'Texas', practice_area: 'Personal Injury', status: 'published', estimated_value: 50000 },
  ],
  BlogPost: [
    { id: 'blog-1', title: 'Mock Blog Post', slug: 'mock-post', is_published: true, category: 'Updates', excerpt: 'A test blog post.' },
  ],
};
```

The mock client's `.filter()` and `.list()` methods return the array for the matching entity name.
