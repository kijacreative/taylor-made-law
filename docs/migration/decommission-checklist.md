# Base44 Decommission Checklist

> Created 2026-04-02. Execute ONLY after all QA plan tests pass (see qa-plan.md).

---

## Prerequisites — Must All Be True Before Starting

- [ ] All 30 CRITICAL QA tests pass against Supabase (qa-plan.md)
- [ ] All provider feature flags set to `supabase` for ≥48 hours with zero errors in production
- [ ] Supabase Edge Functions deployed and handling all 28 backend function equivalents
- [ ] Supabase Postgres RPC functions deployed and handling all 10 query functions
- [ ] Identity map fully resolved — zero orphan records (MIG-04 passes)
- [ ] Password reset campaign completed — >90% of active users have set Supabase passwords
- [ ] Stripe webhook endpoint updated to point to Supabase Edge Function (not Base44)
- [ ] Data migration pipeline run final time — row counts match (MIG-05 passes)

---

## Phase 1: Read-Only Transition

Freeze all writes to Base44 before cutting over. This is a one-way door.

### Step 1.1: Freeze Base44 writes

| Action | How | Verify |
|--------|-----|--------|
| Set all provider flags to `supabase` | `.env`: `VITE_PROVIDER_*=supabase` for all domains | Console shows `[PROVIDER:supabase]` for all requests |
| Disable Base44 backend function deploys | Base44 dashboard → freeze deployments | No new function versions can be published |
| Run final data export | `bash scripts/migration/run-migration.sh export` | Export files timestamped, counts logged |
| Run final data import | `bash scripts/migration/run-migration.sh import` | All phases complete, zero batch failures |
| Run final verification | `bash scripts/migration/run-migration.sh verify` | Exit code 0, all checks pass |

### Step 1.2: Monitor read traffic (24 hours)

| Check | Interval | Success Criteria |
|-------|----------|-----------------|
| Console error rate | Hourly | Zero `[PROVIDER:base44]` logs (all traffic on Supabase) |
| Supabase query latency | Hourly | p95 < 500ms for all read queries |
| Auth session stability | Hourly | Zero unexpected logouts or session failures |
| Real-time messaging | Continuous | DM and circle chat updates arrive within 2s |
| File access | Spot check | Signed URLs generate correctly, old Base44 URLs still load |

### Step 1.3: Go / No-Go decision

**Go** if all monitoring checks pass for 24 hours.
**No-Go** if any CRITICAL test fails — execute rollback (see Section 5).

---

## Phase 2: Final Verification Queries

Run these against Supabase to confirm data integrity before removing Base44.

### Row count verification

```sql
-- Run in Supabase SQL editor or via psql

SELECT 'profiles' as table_name, count(*) as rows FROM profiles
UNION ALL SELECT 'lawyer_profiles', count(*) FROM lawyer_profiles
UNION ALL SELECT 'lawyer_applications', count(*) FROM lawyer_applications
UNION ALL SELECT 'cases', count(*) FROM cases
UNION ALL SELECT 'leads', count(*) FROM leads
UNION ALL SELECT 'legal_circles', count(*) FROM legal_circles
UNION ALL SELECT 'legal_circle_members', count(*) FROM legal_circle_members
UNION ALL SELECT 'direct_message_threads', count(*) FROM direct_message_threads
UNION ALL SELECT 'direct_messages', count(*) FROM direct_messages
UNION ALL SELECT 'circle_messages', count(*) FROM circle_messages
UNION ALL SELECT 'blog_posts', count(*) FROM blog_posts
UNION ALL SELECT 'resources', count(*) FROM resources
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
ORDER BY table_name;
```

Compare against Base44 export counts in `scripts/migration/logs/export-*.jsonl`.

### FK integrity verification

```sql
-- Orphan lawyer_profiles (user_id not in profiles)
SELECT count(*) as orphans FROM lawyer_profiles lp
  LEFT JOIN profiles p ON p.id = lp.user_id
  WHERE p.id IS NULL;

-- Orphan direct_messages (thread_id not in threads)
SELECT count(*) as orphans FROM direct_messages dm
  LEFT JOIN direct_message_threads t ON t.id = dm.thread_id
  WHERE t.id IS NULL;

-- Orphan circle_messages (circle_id not in circles)
SELECT count(*) as orphans FROM circle_messages cm
  LEFT JOIN legal_circles lc ON lc.id = cm.circle_id
  WHERE lc.id IS NULL;

-- All should return 0
```

### Auth verification

```sql
-- Every profile has a matching auth.users entry
SELECT count(*) as missing_auth FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE u.id IS NULL;

-- Every profile has an email
SELECT count(*) as no_email FROM profiles WHERE email IS NULL OR email = '';

-- Admin count matches expectations
SELECT role, count(*) FROM profiles GROUP BY role;

-- Status distribution
SELECT user_status, count(*) FROM profiles GROUP BY user_status ORDER BY count(*) DESC;
```

### RLS spot check

```sql
-- As anon (should see only published blog posts)
-- Run via Supabase client with anon key:
SELECT count(*) FROM blog_posts; -- should return only published count

-- As authenticated non-admin (should see only own profile)
-- Run via Supabase client with user JWT:
SELECT count(*) FROM profiles; -- should return 1

-- As admin (should see all profiles)
-- Run via Supabase client with admin JWT:
SELECT count(*) FROM profiles; -- should return total user count
```

---

## Phase 3: Remove Base44 Code

### Step 3.1: Remove npm packages

```bash
npm uninstall @base44/sdk @base44/vite-plugin
```

### Step 3.2: Delete Base44 client files

| File | Action |
|------|--------|
| `src/api/base44Client.js` | DELETE |
| `src/api/base44MockClient.js` | DELETE |

### Step 3.3: Update vite.config.js

Remove Base44 plugin. Before:
```javascript
import base44 from "@base44/vite-plugin"
// ... base44({ legacySDKImports, hmrNotifier, ... })
```

After:
```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
});
```

### Step 3.4: Update index.html

| Change | Before | After |
|--------|--------|-------|
| Favicon | `href="https://base44.com/logo_v2.svg"` | `href="/favicon.svg"` (self-hosted) |
| Title | `<title>Base44 APP</title>` | `<title>Taylor Made Law</title>` |
| Remove Base44 injected scripts | 3 `<script>` tags referencing `@base44/vite-plugin/dist/injections/` | DELETE all three |
| Remove Base44 sandbox bridge | `<script>` block checking `window.self !== window.top` | DELETE |

### Step 3.5: Update service files (remove Base44 import)

All 11 service files currently import `base44`. After full Supabase cutover, each service should import only from `@/api/supabaseClient`:

| Service | Remove | Keep |
|---------|--------|------|
| `services/auth.js` | `import { base44 }` | `import { getSupabase }` |
| `services/lawyers.js` | `import { base44 }` | `import { getSupabase }` |
| `services/cases.js` | `import { base44 }` | `import { getSupabase }` |
| `services/circles.js` | `import { base44 }` | `import { getSupabase }` |
| `services/messaging.js` | `import { base44 }` | `import { getSupabase }` |
| `services/content.js` | `import { base44 }` | `import { getSupabase }` |
| `services/notifications.js` | `import { base44 }` | `import { getSupabase }` |
| `services/admin.js` | `import { base44 }` | `import { getSupabase }` |
| `services/storage.js` | `import { base44 }` | `import { getSupabase }` |
| `services/onboarding.js` | `import { base44 }` | `import { getSupabase }` |

### Step 3.6: Remove AuthContext Base44 dependencies

| Change | File |
|--------|------|
| Remove `import { createAxiosClient }` | `src/lib/AuthContext.jsx:4` |
| Remove `import { MOCK_USER_DATA, MOCK_PUBLIC_SETTINGS }` | `src/lib/AuthContext.jsx:5` |
| Remove mock mode block | `src/lib/AuthContext.jsx:27-34` |
| Remove `createAxiosClient` public settings call | `src/lib/AuthContext.jsx:39-46` |
| Replace with `supabase.auth.getSession()` | Entire `checkAppState` function |

### Step 3.7: Remove app-params.js

| File | Action | Reason |
|------|--------|--------|
| `src/lib/app-params.js` | DELETE | Handles Base44 token extraction from URL — Supabase manages tokens internally |

Update any imports of `appParams`:
- `src/lib/AuthContext.jsx` — remove `import { appParams }` and all `appParams.*` references

### Step 3.8: Remove NavigationTracker Base44 dependency

| File | Change |
|------|--------|
| `src/lib/NavigationTracker.jsx` | Remove `import { base44 }` and `base44.appLogs.logUserInApp()` — replace with Supabase analytics or remove entirely |

### Step 3.9: Remove provider feature flag defaults

After all domains are on Supabase permanently, simplify `services/provider.js`:

```javascript
// Before: checks env var, defaults to 'base44'
// After: always returns true (Supabase is the only provider)
export function useSupabase() { return true; }
export function logProvider() {} // no-op — single provider, no need to log
```

Or remove the provider module entirely and strip all `if (useSupabase(...))` conditionals from services.

### Step 3.10: Remove environment variables

| Variable | Action |
|----------|--------|
| `VITE_USE_MOCKS` | REMOVE from `.env` and `.env.example` |
| `VITE_BASE44_APP_ID` | REMOVE |
| `VITE_BASE44_FUNCTIONS_VERSION` | REMOVE |
| `VITE_BASE44_APP_BASE_URL` | REMOVE |
| `VITE_PROVIDER_CONTENT_READ` | REMOVE (no longer dual-provider) |
| `VITE_PROVIDER_PROFILE_READ` | REMOVE |
| `BASE44_LEGACY_SDK_IMPORTS` | REMOVE from vite.config.js `process.env` reference |

---

## Phase 4: Archive & Cleanup

### Step 4.1: Archive Base44 functions

```bash
# Tag the commit that last used Base44 functions
git tag base44-archive-$(date +%Y%m%d)

# Move functions to archive (don't delete yet)
mkdir -p archive
mv base44/ archive/base44-functions

# Or simply delete if you're confident
# rm -rf base44/
```

### Step 4.2: Delete nested duplicate directory

```bash
# Verify nothing references it
grep -r "taylor-made-law/" src/ scripts/ docs/ 2>/dev/null | head -5
# If empty:
rm -rf taylor-made-law/
```

### Step 4.3: Clean up package-lock.json

```bash
rm -rf node_modules package-lock.json
npm install
# Verify build still passes
npm run build
```

### Step 4.4: Clean up migration scripts (optional)

Migration scripts in `scripts/migration/` are no longer needed for runtime but useful for reference. Options:

- **Keep as-is** — no harm, good historical reference
- **Move to `archive/`** — keeps repo clean
- **Delete** — if migration is confirmed complete and data is verified

---

## Phase 5: Rollback Trigger Conditions

### Automatic rollback triggers (any one = rollback immediately)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| **Auth failures** | >5% of login attempts fail within 1 hour | Rollback auth provider to Base44 |
| **Data query errors** | >1% of Supabase queries return 500 within 30 minutes | Rollback affected provider flag to `base44` |
| **Real-time failures** | DM/circle messages not delivered within 30 seconds | Rollback messaging provider |
| **File access failures** | >3 signed URL generation failures within 15 minutes | Rollback storage to Base44 Core.UploadFile |
| **Session instability** | >10 unexpected logouts within 1 hour | Rollback auth provider |

### Manual rollback triggers (engineering judgment)

| Trigger | Assessment | Action |
|---------|-----------|--------|
| **RLS policy blocks legitimate access** | User reports "access denied" that should be allowed | Fix RLS policy first, rollback only if unfixable quickly |
| **Data inconsistency** | Row counts differ between export and Supabase by >1% | Investigate before rollback — may be timing issue |
| **Performance degradation** | p95 latency >2s for any query (vs <500ms target) | Optimize query first, rollback if no improvement in 1 hour |
| **Stripe webhook failures** | Subscription events not processing | Rollback Stripe endpoint to Base44 function immediately |

### Rollback procedure

```bash
# 1. Set all provider flags back to base44
# In .env:
VITE_PROVIDER_CONTENT_READ=base44
VITE_PROVIDER_PROFILE_READ=base44
# (set all future flags to base44 too)

# 2. Restart dev server / redeploy
npm run dev

# 3. Verify Base44 is serving requests
# Console should show [PROVIDER:base44] for all domains

# 4. If auth was already cut over (Phase 3 started):
#    CANNOT rollback auth without re-deploying pre-Phase-3 code
#    Use git: git checkout base44-archive-{date} -- src/lib/AuthContext.jsx src/api/base44Client.js
```

### Rollback is NOT possible after:

- [ ] `@base44/sdk` removed from `package.json` AND code deployed
- [ ] `base44Client.js` deleted AND code deployed
- [ ] Base44 account deactivated or subscription cancelled

**Recommendation:** Keep Base44 account active for 30 days after full decommission. Don't delete the SDK from package.json until all monitoring thresholds pass for 7 consecutive days.

---

## Phase 6: Documentation Updates

### Files to update after decommission

| File | Update Required |
|------|----------------|
| **CLAUDE.md** | Remove "Stack Inventory" Base44 entries. Remove "Architecture" diagram Base44 layer. Remove "Migration Risks" section (no longer applicable). Update "Local Development" to remove mock mode instructions. Remove "Supabase Foundation (not connected)" — it's now the primary database. Update "Auth Flow" to describe Supabase Auth. Update "Database Dependencies" to describe PostgreSQL. |
| **LOCAL_DEV.md** | Rewrite entirely: remove mock mode, Base44 references. Document Supabase local setup as the only dev mode. |
| **README.md** | Update to reflect Supabase stack. Remove Base44 references. |
| **.env.example** | Remove all `VITE_BASE44_*` and `VITE_USE_MOCKS` vars. Remove `VITE_PROVIDER_*` vars. Keep only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| **docs/migration/*.md** | Add "COMPLETED" header to each doc with completion date. Keep for historical reference. |

### New documentation to create

| File | Contents |
|------|----------|
| **docs/architecture.md** | Post-migration architecture diagram (React SPA + Supabase Auth + PostgreSQL + Supabase Storage + Edge Functions + Realtime) |
| **docs/deployment.md** | Supabase project setup, environment configuration, CI/CD pipeline |

---

## Phase 7: Final Verification (Day 30)

Run 30 days after decommission to confirm stability:

- [ ] Zero Base44 SDK references in `npm ls` output
- [ ] Zero `base44` strings in built JavaScript bundles: `grep -r "base44" dist/assets/`
- [ ] Zero `base44_access_token` keys in any user's localStorage (sample check)
- [ ] Base44 dashboard shows zero API calls in last 7 days
- [ ] All 99 QA plan tests pass against Supabase
- [ ] Supabase billing matches expected usage (no runaway queries)
- [ ] Deactivate Base44 account

---

## Summary of Removals

| Category | Items | Files Affected |
|----------|-------|---------------|
| npm packages | 2 (`@base44/sdk`, `@base44/vite-plugin`) | package.json |
| Source files to delete | 3 (`base44Client.js`, `base44MockClient.js`, `app-params.js`) | src/api/, src/lib/ |
| Source files to update | 13 (11 services + AuthContext + NavigationTracker) | src/services/, src/lib/ |
| Config files to update | 3 (`vite.config.js`, `index.html`, `.env.example`) | root |
| Directories to delete | 2 (`base44/`, `taylor-made-law/`) | root |
| Env vars to remove | 6 | .env, .env.example |
| Documentation to update | 4 (`CLAUDE.md`, `LOCAL_DEV.md`, `README.md`, `.env.example`) | root, docs/ |
