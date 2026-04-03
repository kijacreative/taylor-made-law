# Auth Migration: Base44 → Supabase

> Written 2026-04-02. Design document only — no code changes. Implementation deferred.

---

## 1. Current Auth Flow (Base44) — End to End

### Token Lifecycle

```
1. User visits app
2. app-params.js checks URL for ?access_token=
   → stores in localStorage as "base44_access_token"
   → removes from URL
3. base44Client.js passes token to createClient({ token })
4. SDK attaches token to every HTTP request
5. AuthContext.jsx calls:
   a. createAxiosClient → GET /api/apps/public/prod/public-settings/{appId}
   b. If token exists: base44.auth.me() → returns user object
6. User object stored in React Context → isAuthenticated = true
7. On logout: base44.auth.logout() → clears localStorage → optional redirect
```

**Key facts:**
- Token is opaque (not JWT — or if JWT, frontend never decodes it)
- Token validation is 100% server-side (Base44 cloud)
- No refresh token mechanism visible
- Token persists in localStorage until explicit logout

### Login Paths

| Path | Entry Point | SDK Methods | Post-Login |
|------|-------------|-------------|------------|
| **Lawyer email/password** | LawyerLogin.jsx, LawyerPortalLogin.jsx | `auth.loginViaEmailPassword()` → `auth.me()` | Role/status checks → dashboard or onboarding |
| **Admin OTP** | AdminLogin.jsx | `auth.redirectToLogin()` → `auth.verifyOtp()` → `auth.me()` | Role check → AdminDashboard |
| **Signup (with password)** | JoinLawyerNetwork.jsx | Backend `publicLawyerSignup` → `auth.register()` | Redirect to `/verify-email` |
| **Signup (no password)** | ForLawyers.jsx | Backend `submitLawyerApplication` | Success screen → wait for admin email |
| **Activation** | Activate.jsx | Backend `activateAccount` → `auth.loginViaEmailPassword()` | Auto-login → dashboard |

### Service Layer Contract (what pages call)

```
src/services/auth.js
  getCurrentUser()      → user object or null
  isAuthenticated()     → boolean
  me()                  → user object (throws if not auth)
  login(email, pw)      → token
  logout(redirectUrl?)  → void
  redirectToLogin(url)  → void
  verifyOtp({email, otpCode}) → result
  resendOtp(email)      → result
  resetPassword({token, pw})  → result
  updateMe(updates)     → updated user
  getProfile(userId)    → LawyerProfile or null
  inviteUser(email, role) → result
```

### Where Auth is Checked (frontend)

| Layer | How | Files |
|-------|-----|-------|
| **AuthContext** | `auth.me()` on mount → sets user in Context | 1 file (AuthContext.jsx) |
| **App.jsx** | Reads authError from Context → redirects or shows error | 1 file |
| **Per-page useEffect** | `getCurrentUser()` → null check → redirect | 30+ pages via services/auth |
| **Conditional rendering** | `user.role`, `user.user_status`, `user.membership_status` | 50+ files |

### Where Auth is Checked (backend)

| Pattern | Functions | Method |
|---------|-----------|--------|
| No auth (public) | 17 functions | No `auth.me()` call |
| User auth | 18 functions | `auth.me()` → null check → 401 |
| Admin auth | 14 functions | `auth.me()` → `role !== 'admin'` → 403 |

---

## 2. Supabase Auth — What It Provides

| Feature | Supabase | Base44 Equivalent |
|---------|----------|-------------------|
| Email/password signup | `supabase.auth.signUp()` | `auth.register()` |
| Email/password login | `supabase.auth.signInWithPassword()` | `auth.loginViaEmailPassword()` |
| Session check | `supabase.auth.getSession()` | `auth.isAuthenticated()` |
| Get current user | `supabase.auth.getUser()` | `auth.me()` |
| Logout | `supabase.auth.signOut()` | `auth.logout()` |
| Password reset | `supabase.auth.resetPasswordForEmail()` + `updateUser()` | `auth.resetPassword()` |
| OTP / Magic link | `supabase.auth.signInWithOtp()` | `auth.verifyOtp()` |
| JWT tokens | Auto-managed (access + refresh in localStorage) | Opaque token in localStorage |
| Session persistence | `supabase.auth.onAuthStateChange()` listener | Manual token check |
| Email verification | Built-in (confirm_email setting) | Custom OTP system |
| User metadata | `auth.users.raw_user_meta_data` | Separate User entity fields |

### Key Difference: User Object Shape

**Base44 `auth.me()` returns:**
```json
{
  "id": "...",
  "email": "...",
  "full_name": "...",
  "role": "admin",
  "user_type": "admin",
  "user_status": "approved",
  "membership_status": "paid",
  "firm_name": "...",
  "profile_photo_url": "...",
  // ... 30+ fields from User entity
}
```

**Supabase `auth.getUser()` returns:**
```json
{
  "id": "uuid",
  "email": "...",
  "user_metadata": { "full_name": "..." },
  "app_metadata": {},
  // No app-specific fields — those live in profiles table
}
```

**Bridge requirement:** After Supabase auth, fetch the `profiles` row to get role, status, firm, etc. The service layer must combine `auth.getUser()` + `profiles` query into the same shape pages expect.

---

## 3. Role & Permission Implications

### Roles stored in profiles table (not auth.users)

Supabase Auth has no built-in role system. The app's role model lives entirely in the `profiles` table:

```
profiles.role           → 'admin' | 'user'
profiles.user_type      → 'admin' | 'senior_associate' | 'junior_associate' | null
profiles.user_status    → 'invited' | 'pending' | 'approved' | 'disabled'
profiles.membership_status → 'paid' | 'trial' | 'none'
```

**RLS uses profiles table for authorization:**
```sql
-- Example: admin check
exists (select 1 from profiles where id = auth.uid() and role = 'admin')
```

**No change needed in frontend role checks** — pages check `user.role`, `user.user_status` etc. As long as the service layer returns these fields, everything works.

### Admin tier (user_type) for lead review

The three-tier lead review system (junior → senior → admin) uses `user_type`. This must be set in `profiles` during admin user creation. Supabase Auth doesn't know about it.

---

## 4. Session Handling Implications

### Base44 → Supabase session differences

| Aspect | Base44 | Supabase |
|--------|--------|----------|
| Token storage | `localStorage["base44_access_token"]` | `localStorage["sb-<ref>-auth-token"]` (auto-managed) |
| Token type | Opaque string | JWT (access) + refresh token |
| Token refresh | Not visible (assumed server-side) | Auto-refresh via `onAuthStateChange` |
| Session check | `auth.isAuthenticated()` (HTTP call) | `getSession()` (local + optional verify) |
| Expiry | Unknown | Configurable (default 3600s access, 1 week refresh) |
| Multi-tab | Shared via localStorage | Shared via localStorage + broadcast |

### Migration concern: dual tokens

During migration, both `base44_access_token` and Supabase's `sb-*-auth-token` may exist in localStorage. The service layer must check the right one based on which backend is active.

**Strategy:** The `VITE_USE_MOCKS` / `VITE_AUTH_PROVIDER` env var controls which auth path runs. No dual-token conflict if only one provider is active at a time.

---

## 5. Bridge Strategy: identity_map

### Problem

Base44 and Supabase use different user IDs. During migration:
- Existing data references Base44 user IDs
- New auth issues Supabase UUIDs
- We need to map between them during the transition period

### Schema: identity_map table

```sql
create table identity_map (
  id              uuid primary key default gen_random_uuid(),
  base44_user_id  text not null unique,  -- original Base44 ID
  supabase_user_id uuid unique references auth.users(id) on delete set null,
  email           text not null,
  migrated_at     timestamptz,
  migration_method text,  -- 'password_reset', 'auto_import', 'manual'
  created_at      timestamptz default now()
);

create index idx_identity_map_base44 on identity_map(base44_user_id);
create index idx_identity_map_supabase on identity_map(supabase_user_id);
create index idx_identity_map_email on identity_map(email);
```

### Migration flow per user

```
1. Export user list from Base44 (email, base44_user_id, role, status)
2. For each user:
   a. Create identity_map row (base44_user_id, email)
   b. Create Supabase auth.users account (via admin API)
   c. Create profiles row (with all app fields from Base44)
   d. Update identity_map (supabase_user_id, migrated_at)
3. Send password reset emails to all users
   (Base44 passwords are not exportable — users must set new passwords)
4. Rewrite FK references in data tables from base44_user_id to supabase_user_id
```

### Password migration

**Base44 password hashes are not accessible.** Every user must reset their password. Two strategies:

| Strategy | UX Impact | Effort |
|----------|-----------|--------|
| **Bulk password reset email** | Users get "Set your new password" email before cutover | Low — use Supabase `resetPasswordForEmail()` |
| **Lazy migration on first login** | First login attempt fails, prompts password reset | Zero prep, but confusing UX |

**Recommendation:** Bulk password reset email sent 24-48 hours before cutover, with clear messaging that the platform is upgrading security.

---

## 6. Cutover Steps by Flow

### Signup (ForLawyers, JoinNetwork, JoinLawyerNetwork)

| Step | Base44 (current) | Supabase (target) |
|------|-----------------|-------------------|
| 1. User submits form | `publicLawyerSignup` → `auth.register()` | `supabase.auth.signUp({ email, password })` |
| 2. Account created | Base44 creates user + sends OTP | Supabase creates auth.users row → trigger creates profiles row |
| 3. Email verification | Custom OTP system (`sendEmailOtp` → `verifyEmailOtp`) | Supabase built-in email confirmation (or keep custom OTP via Edge Function) |
| 4. Application record | Backend creates LawyerApplication | Supabase Edge Function or direct insert with service_role |
| 5. Profile fields | Backend populates User entity fields | Edge Function populates profiles + lawyer_applications tables |

**Service layer change:**
```javascript
// services/onboarding.js — BEFORE
export function publicLawyerSignup(payload) {
  return base44.functions.invoke('publicLawyerSignup', payload);
}

// services/onboarding.js — AFTER
export async function publicLawyerSignup(payload) {
  const { email, password, full_name, ...profileData } = payload;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });
  if (error) throw error;
  // Profile fields populated by DB trigger + Edge Function for application
  await supabase.functions.invoke('create-lawyer-application', {
    body: { ...profileData, email }
  });
  return { data: { success: true } };
}
```

### Login (LawyerLogin, LawyerPortalLogin)

| Step | Base44 | Supabase |
|------|--------|----------|
| 1. User submits email/password | `auth.loginViaEmailPassword()` | `supabase.auth.signInWithPassword({ email, password })` |
| 2. Token returned | Opaque token stored in localStorage | JWT auto-stored by Supabase client |
| 3. Get user data | `auth.me()` → returns full user object | `auth.getUser()` → returns auth user, then fetch profiles row |
| 4. Role/status check | Direct on user object | From profiles row joined with auth user |

**Service layer change:**
```javascript
// services/auth.js — AFTER
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  // Fetch profile to get role, status, etc.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  // Merge auth user + profile into the shape pages expect
  return { ...session.user, ...profile };
}
```

### Admin Login (OTP)

| Step | Base44 | Supabase |
|------|--------|----------|
| 1. Admin enters email | `auth.redirectToLogin()` → Base44 hosted login | `supabase.auth.signInWithOtp({ email })` |
| 2. OTP code sent | Base44 sends OTP | Supabase sends magic link or OTP (configurable) |
| 3. Verify OTP | `auth.verifyOtp({ email, otpCode })` | `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| 4. Role check | `me()` → `role !== 'admin'` → reject | Same check on profiles row |

### Logout

| Step | Base44 | Supabase |
|------|--------|----------|
| 1. Clear session | `auth.logout()` clears localStorage token | `supabase.auth.signOut()` clears all Supabase tokens |
| 2. Redirect | Optional `auth.logout(redirectUrl)` | Manual `navigate('/login')` after signOut |

**Service layer change is trivial:**
```javascript
export async function logout(redirectUrl) {
  await supabase.auth.signOut();
  if (redirectUrl) window.location.href = redirectUrl;
}
```

### Password Reset

| Step | Base44 | Supabase |
|------|--------|----------|
| 1. Request reset | `Core.SendEmail()` with client-generated token (⚠️ insecure) | `supabase.auth.resetPasswordForEmail(email)` |
| 2. Email sent | Custom email via Resend | Supabase sends built-in reset email |
| 3. User clicks link | Lands on `/ResetPassword?token=...` | Lands on `/set-password` (Supabase redirects with access token) |
| 4. Set new password | `auth.resetPassword({ resetToken, newPassword })` | `supabase.auth.updateUser({ password: newPassword })` |

**Security improvement:** Supabase eliminates the client-side token generation vulnerability (current Base44 implementation uses `Math.random()`).

### Protected Routes

**No change needed in the protection pattern.** Pages call `getCurrentUser()` from `services/auth.js`. The service layer implementation changes, but the contract doesn't:

```javascript
// Every protected page does this (unchanged):
const me = await getCurrentUser();
if (!me) { navigate('/login'); return; }
if (me.role === 'admin') { navigate('/AdminDashboard'); return; }
setUser(me);
```

The `getCurrentUser()` function is the only thing that changes internally — from Base44 SDK calls to Supabase client + profile query.

### AuthContext Changes

```javascript
// AuthContext.jsx — key change
const checkAppState = async () => {
  // BEFORE: createAxiosClient → public-settings API → auth.me()
  // AFTER:
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    return;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  setUser({ ...session.user, ...profile });
  setIsAuthenticated(true);

  // Listen for auth state changes (token refresh, logout in other tab)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      setUser(null);
      setIsAuthenticated(false);
    }
  });
};
```

---

## 7. Cutover Checklist

### Pre-cutover (can do now)
- [x] Supabase schema created (migrations 00001-00009)
- [x] Service layer abstraction complete (70 files migrated)
- [ ] Install `@supabase/supabase-js` client
- [ ] Create `src/api/supabaseClient.js`
- [ ] Add identity_map migration (00010)
- [ ] Write Supabase Edge Functions for: signup application, email OTP, case acceptance, etc.

### Cutover day
- [ ] Export all users from Base44 (email, ID, role, status, all profile fields)
- [ ] Import users into Supabase auth + profiles + identity_map
- [ ] Rewrite FK references in all data tables
- [ ] Send bulk password reset emails
- [ ] Switch `services/auth.js` to Supabase implementation
- [ ] Switch `AuthContext.jsx` to Supabase session management
- [ ] Switch `VITE_USE_MOCKS=false` + set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] Remove `VITE_BASE44_*` env vars
- [ ] Monitor error rates for 24h

### Post-cutover
- [ ] Remove Base44 SDK imports from `services/auth.js` and `AuthContext.jsx`
- [ ] Remove `@base44/sdk` from package.json
- [ ] Remove `@base44/vite-plugin` from vite.config.js
- [ ] Remove `base44Client.js` and `base44MockClient.js`
- [ ] Remove `app-params.js` (no longer needed — Supabase handles tokens)
- [ ] Drop identity_map table after confirming all references migrated

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **All users must reset passwords** | High | Pre-cutover bulk email with clear messaging. Lazy reset fallback. |
| **User ID format change** | High | identity_map table + FK rewrite script. Test with data subset first. |
| **Base44 token in localStorage** | Medium | Supabase uses different key prefix (`sb-*`). No conflict. Clean up old key on first Supabase login. |
| **RLS policy errors** | Medium | Test every policy with service_role and anon key before cutover. |
| **Email verification flow change** | Medium | Can keep custom OTP system via Edge Functions if Supabase built-in doesn't fit. |
| **Admin OTP flow** | Low | Supabase `signInWithOtp` is a direct replacement. Same UX. |
| **Profile shape mismatch** | Low | Service layer merges auth.getUser() + profiles query. Same shape returned to pages. |
| **Real-time auth state** | Low | Supabase `onAuthStateChange` is better than Base44's polling pattern. |
