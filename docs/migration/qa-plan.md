# Regression & Permissions QA Plan

> Created 2026-04-02. Covers the Base44 → Supabase migration.
> All scenarios derived from actual code paths — file and line references included.

---

## How to Read This Document

Each test has:
- **ID** — unique reference (e.g., `AUTH-01`)
- **Priority** — CRITICAL (must pass before launch), HIGH (before beta), MEDIUM (before full launch)
- **Steps** — exact actions to perform
- **Expected** — what should happen
- **Code ref** — source file and line where the behavior is implemented

---

## 1. Happy-Path Tests

### Auth Happy Paths

| ID | Test | Steps | Expected | Priority | Code Ref |
|----|------|-------|----------|----------|----------|
| AUTH-01 | Lawyer email/password login | Enter valid email + password on `/login` | Token stored, redirect to `/LawyerDashboard` or `/app/onboarding` | CRITICAL | LawyerPortalLogin:81 |
| AUTH-02 | Admin OTP login | Enter admin email on `/AdminLogin`, receive OTP, submit code | Token stored, redirect to `/AdminDashboard` | CRITICAL | AdminLogin:85 |
| AUTH-03 | Logout clears session | Click logout from sidebar | localStorage cleared, redirect to `/login` | CRITICAL | AppSidebar:105 |
| AUTH-04 | Password reset flow | Click "Forgot Password", enter email, click link, set new password | Password updated, redirect to `/login` | HIGH | ForgotPassword:28, SetPassword:51 |
| AUTH-05 | Signup + email verify | Fill JoinLawyerNetwork form, submit, enter OTP | Account created, redirect to `/login?activated=1` | CRITICAL | JoinLawyerNetwork:118, VerifyEmail:40 |
| AUTH-06 | Account activation | Click activation link from admin email, set password | Account activated, auto-login to dashboard | HIGH | Activate:96 |

### Core Feature Happy Paths

| ID | Test | Steps | Expected | Priority | Code Ref |
|----|------|-------|----------|----------|----------|
| CASE-01 | Browse case exchange | Navigate to `/CaseExchange` as approved+paid lawyer | Full case details visible, accept button enabled | CRITICAL | CaseExchange:69 |
| CASE-02 | Accept case | Click "Accept" on published case | Case status → accepted, confirmation shown | CRITICAL | CaseDetail:120 |
| CASE-03 | Admin publishes case from lead | Open lead detail, click "Publish to Marketplace" | Case created with status=published, lead status=published | HIGH | AdminLeadDetail:262 |
| MSG-01 | Send direct message | Open `/app/messages`, start thread, type message, send | Message appears in thread, inbox shows new preview | HIGH | DirectMessageThread:222 |
| MSG-02 | Receive message real-time | Other user sends DM while thread is open | Message appears without page refresh | HIGH | DirectMessageThread:155 |
| CIRCLE-01 | Create legal circle | Fill CreateGroup form, submit | Circle created, user is admin member | HIGH | CreateGroup:72 |
| CIRCLE-02 | Invite to circle | Open circle members tab, search attorney, invite | Invitation created, email sent | HIGH | CircleMembers:86 |
| CIRCLE-03 | Accept circle invite | Open `/GroupInvitations`, click Accept | Membership created, redirect to circle detail | HIGH | GroupInvitations:74 |
| CONTENT-01 | Public blog loads | Navigate to `/Blog` unauthenticated | Published posts visible, no errors | CRITICAL | Blog:83 |
| CONTENT-02 | Admin creates blog post | Open AdminBlogEdit, fill fields, publish | Post created with status=published, visible on `/Blog` | HIGH | AdminBlogEdit:150 |

---

## 2. Edge-Case Tests

| ID | Test | Steps | Expected | Priority | Code Ref |
|----|------|-------|----------|----------|----------|
| EDGE-01 | Accept already-accepted case | Two lawyers click accept simultaneously | First succeeds, second gets "no longer available" | HIGH | CaseDetail:120 |
| EDGE-02 | Login with disabled account | Disabled lawyer enters valid credentials | Login succeeds, then immediate logout + disabled banner | CRITICAL | LawyerPortalLogin:85 |
| EDGE-03 | Visit activation link twice | Click activation link, activate, click same link again | Second attempt shows "already used" error | HIGH | Activate:115 |
| EDGE-04 | Expired activation token | Click activation link after 7 days | Error "link expired" with resend option | HIGH | Activate:112 |
| EDGE-05 | Empty inbox polling | Open `/app/messages` with no threads, wait 30s | No errors, polling continues silently | MEDIUM | DirectMessages:63 |
| EDGE-06 | Delete last circle member | Circle admin removes all members then self | Circle becomes empty, soft-deleted | MEDIUM | CircleSettings:42 |
| EDGE-07 | Upload oversized file | Upload 100MB file to circle documents | Error "file too large" before upload attempt | MEDIUM | CircleDocuments:313 |
| EDGE-08 | Navigate to non-existent case | Visit `/CaseDetail?id=nonexistent` | 404 or "case not found" message | MEDIUM | CaseDetail:87 |
| EDGE-09 | Concurrent circle delete + message send | Delete circle while another member sends chat message | Message send fails gracefully (circle inactive) | MEDIUM | CircleChat:208 |
| EDGE-10 | Profile enrichment with missing profiles | Circle with 5 members, 2 profiles missing from DB | Members with missing profiles show email or "Attorney" | MEDIUM | GroupDetail:81 |
| EDGE-11 | Blog body with inline Base44 URLs | View old blog post with Base44 image URLs embedded in HTML | Images still load (Base44 URLs are permanent) | HIGH | PublicBlogDetail:body render |
| EDGE-12 | OTP rate limit | Request 6 OTPs within 1 hour for same email | 6th request rejected with rate limit error | MEDIUM | sendEmailOtp backend |

---

## 3. Role & Permission Tests

### Admin vs Lawyer Portal Access

| ID | Route | As Admin | As Senior | As Junior | As Lawyer | As Unauth | Code Ref |
|----|-------|----------|-----------|-----------|-----------|-----------|----------|
| PERM-01 | `/AdminDashboard` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ → `/LawyerDashboard` | ❌ → `/login` | AdminDashboard:45 |
| PERM-02 | `/AdminLeads` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ → `/LawyerDashboard` | ❌ → `/login` | AdminLeads:52 |
| PERM-03 | `/AdminLawyers` | ✅ Allowed | ❌ → Redirect | ❌ → Redirect | ❌ → Redirect | ❌ → `/login` | AdminLawyers:96 |
| PERM-04 | `/AdminTeam` | ✅ Allowed | ❌ → Redirect | ❌ → Redirect | ❌ → Redirect | ❌ → `/login` | AdminTeam:50 |
| PERM-05 | `/AdminBlog` | ✅ Allowed | ❌ → Redirect | ❌ → Redirect | ❌ → Redirect | ❌ → `/login` | AdminBlog:54 |
| PERM-06 | `/LawyerDashboard` | ❌ → `/AdminDashboard` | ❌ → `/AdminDashboard` | ❌ → `/AdminDashboard` | ✅ Allowed | ❌ → `/login` | LawyerDashboard:55 |
| PERM-07 | `/CaseExchange` | ❌ → `/AdminDashboard` | ❌ → `/AdminDashboard` | ❌ → `/AdminDashboard` | ✅ Allowed | ❌ → `/login` | CaseExchange:47 |
| PERM-08 | `/app/messages` | N/A | N/A | N/A | ✅ (if approved) | ❌ → `/login` | DirectMessages:40 |

### Status-Based Feature Gates

| ID | Test | Status | Expected | Priority | Code Ref |
|----|------|--------|----------|----------|----------|
| PERM-09 | Case Exchange — pending | `user_status=pending` | Teaser mode: titles only, no accept button | CRITICAL | CaseExchange:57 |
| PERM-10 | Case Exchange — approved unpaid | `user_status=approved`, `membership_status=none` | Full details, upgrade banner, no accept button | CRITICAL | CaseExchange:59 |
| PERM-11 | Case Exchange — approved paid | `user_status=approved`, `membership_status=paid` | Full details + accept button | CRITICAL | CaseExchange:59 |
| PERM-12 | Messaging — pending | `lawyerProfile.status=pending` | "Messaging requires approval" banner | HIGH | DirectMessages:40 |
| PERM-13 | Circle creation — pending | `user_status=pending` | "Create Circle" button disabled | HIGH | Groups:56 |
| PERM-14 | Resource visibility — approved only | `resource.visibility=approved_only`, lawyer not approved | Resource locked/hidden | MEDIUM | LawyerResources:56 |

### Admin Tier (Lead Review Workflow)

| ID | Test | Tier | Action | Expected | Priority |
|----|------|------|--------|----------|----------|
| PERM-15 | Junior recommends approve | junior_associate | Click "Recommend Approve" on lead | Lead status → senior_review | HIGH |
| PERM-16 | Junior tries direct approve | junior_associate | Click "Approve" button (if visible) | Button disabled or 403 | HIGH |
| PERM-17 | Senior approves lead | senior_associate | Click "Approve" | Lead status → approved | HIGH |
| PERM-18 | Senior routes to Cochran | senior_associate | Click "Route to Cochran" | Lead status → routed_cochran, email sent | HIGH |
| PERM-19 | Admin can do anything | admin | All lead actions | All succeed | CRITICAL |

### RLS Policy Validation (Supabase-specific)

| ID | Table | Operation | As Owner | As Non-Owner | As Admin | Priority |
|----|-------|-----------|----------|-------------|----------|----------|
| RLS-01 | `profiles` | SELECT own | ✅ | ❌ | ✅ | CRITICAL |
| RLS-02 | `profiles` | UPDATE own | ✅ | ❌ | ✅ | CRITICAL |
| RLS-03 | `cases` | SELECT published | ✅ (if approved) | ❌ (if pending) | ✅ | CRITICAL |
| RLS-04 | `leads` | SELECT | ❌ | ❌ | ✅ | CRITICAL |
| RLS-05 | `legal_circle_members` | SELECT | ✅ (if member) | ❌ | ✅ | HIGH |
| RLS-06 | `direct_messages` | SELECT | ✅ (if participant) | ❌ | ✅ | HIGH |
| RLS-07 | `direct_messages` | UPDATE own | ✅ (sender) | ❌ | ❌ | HIGH |
| RLS-08 | `blog_posts` | SELECT published | ✅ (public) | ✅ (public) | ✅ | CRITICAL |
| RLS-09 | `blog_posts` | INSERT/UPDATE | ❌ | ❌ | ✅ | HIGH |
| RLS-10 | `audit_logs` | INSERT | ✅ (any auth) | ✅ (any auth) | ✅ | MEDIUM |
| RLS-11 | `audit_logs` | SELECT | ❌ | ❌ | ✅ | MEDIUM |
| RLS-12 | `activation_tokens` | ALL | ❌ | ❌ | ❌ (service_role only) | HIGH |
| RLS-13 | `circle_messages` | SELECT | ✅ (member) | ❌ | ✅ | HIGH |
| RLS-14 | `circle_notifications` | SELECT own | ✅ | ❌ | ❌ | MEDIUM |

---

## 4. Storage Access Tests

| ID | Test | Bucket | Steps | Expected | Priority |
|----|------|--------|-------|----------|----------|
| STOR-01 | Upload avatar | `avatars` | Upload profile photo in LawyerOnboarding | Public URL returned, visible immediately | HIGH |
| STOR-02 | Upload blog image | `content` | Upload featured image in AdminBlogEdit | Public URL returned, visible on blog page | HIGH |
| STOR-03 | Upload DM file | `documents` | Attach file in DM thread | Path stored, signed URL generated on view | HIGH |
| STOR-04 | Upload circle file | `documents` | Upload in CircleResources | Path stored, signed URL generated on view | HIGH |
| STOR-05 | Download circle document | `documents` | Click download on versioned document | Signed URL generated (1hr expiry), download starts | HIGH |
| STOR-06 | Expired signed URL | `documents` | Save signed URL, wait >1 hour, try again | Access denied (expired) | MEDIUM |
| STOR-07 | Non-member accesses document URL | `documents` | Non-member uses document URL directly | Access denied (RLS blocks) | HIGH |
| STOR-08 | Admin uploads content | `content` | Admin uploads resource file | Public URL, accessible without auth | MEDIUM |
| STOR-09 | Non-admin tries content upload | `content` | Lawyer tries to upload to content bucket via API | 403 (RLS blocks non-admin) | HIGH |
| STOR-10 | Legacy Base44 URLs still work | N/A | Load old blog post with Base44 image URLs | Images load (Base44 URLs are permanent) | CRITICAL |
| STOR-11 | WordPress URLs still work | N/A | Load home page with hardcoded WordPress logos | All 7 images load | CRITICAL |

---

## 5. Auth & Session Tests

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| SESS-01 | Session persists on refresh | Login, refresh page | User still logged in, no re-authentication | CRITICAL |
| SESS-02 | Session persists on navigate | Login, navigate between routes | Auth state preserved across navigation | CRITICAL |
| SESS-03 | Token refresh after 1 hour | Login, wait 61 minutes idle, then interact | Session auto-refreshed or redirect to login | HIGH |
| SESS-04 | Multi-tab logout sync | Login in tab A + B, logout in tab A | Tab B detects logout within 5s | HIGH |
| SESS-05 | Multi-tab login | Login in tab A, open tab B | Tab B has valid session without re-login | HIGH |
| SESS-06 | Stale Base44 token cleanup | User has old `base44_access_token` in localStorage from before migration | Supabase login clears old token, no conflict | HIGH |
| SESS-07 | Session after password change | User changes password, then uses another tab | Other tab's session still valid until refresh token expires | MEDIUM |
| SESS-08 | Concurrent sessions | User logs in from two devices | Both sessions valid, independent refresh | MEDIUM |
| SESS-09 | Invalid JWT | Manually corrupt JWT in localStorage | Next API call returns 401, redirect to login | HIGH |
| SESS-10 | Email not confirmed | Create account without confirming email, try login | Error "verify your email first" | HIGH |

---

## 6. Rollback Verification Steps

### Provider Flag Rollback

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| ROLL-01 | Rollback content_read | Set `VITE_PROVIDER_CONTENT_READ=base44`, restart | Blog pages read from Base44 again | CRITICAL |
| ROLL-02 | Rollback profile_read | Set `VITE_PROVIDER_PROFILE_READ=base44`, restart | Profile queries use Base44 again | CRITICAL |
| ROLL-03 | Rollback all providers | Remove all `VITE_PROVIDER_*` vars, restart | All queries default to Base44 | CRITICAL |
| ROLL-04 | Partial rollback | Rollback profile_read only, keep content_read on Supabase | Content from Supabase, profiles from Base44 — no errors | HIGH |
| ROLL-05 | Console log verification | After rollback, check browser console | `[PROVIDER:base44]` logs for rolled-back domains | MEDIUM |

### Auth Rollback

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| ROLL-06 | Auth provider rollback | Set `VITE_PROVIDER_AUTH=base44` (future flag) | Login/logout use Base44 SDK again | CRITICAL |
| ROLL-07 | Session survives rollback | User logged in via Supabase, rollback auth to Base44 | User must re-login (different token format) | CRITICAL |
| ROLL-08 | Mock mode still works | Set `VITE_USE_MOCKS=true`, remove all provider flags | App boots with mock data, no Supabase calls | CRITICAL |

### Data Rollback

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| ROLL-09 | Supabase data reset | `npx supabase db reset` → re-run migrations → re-import | Clean state, all data restored | HIGH |
| ROLL-10 | Source data intact | After migration attempt, check Base44 data | No Base44 records modified or deleted | CRITICAL |

---

## 7. Migration-Specific Tests

### Identity Map

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| MIG-01 | All users mapped | Run `build-identity-map.js`, check output | Every user has Base44 ID → Supabase UUID | CRITICAL |
| MIG-02 | Duplicate email detection | Two Base44 users with same email | Conflict logged, one excluded | HIGH |
| MIG-03 | FK rewrite completeness | After import, query any table with user_id FK | All user_ids are valid Supabase UUIDs | CRITICAL |
| MIG-04 | Orphan record detection | Run `verify.js` FK integrity check | Zero orphan rows across all tables | CRITICAL |

### Data Integrity

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| MIG-05 | Row count match | Run `verify.js` row count check | Transform output count = Supabase table count | CRITICAL |
| MIG-06 | Soft-delete conversion | Query `direct_messages` where `deleted_at IS NOT NULL` | Count matches old `is_deleted=true` count | HIGH |
| MIG-07 | Email normalization | Query `profiles` for uppercase emails | Zero rows (all lowercase) | HIGH |
| MIG-08 | Array fields intact | Query `profiles.states_licensed` | PostgreSQL text[] arrays, not JSON strings | HIGH |
| MIG-09 | Timestamp conversion | Query `profiles.created_at` | Valid timestamps (not `created_date` column name) | MEDIUM |

### Password Reset Campaign

| ID | Test | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| MIG-10 | Bulk reset emails sent | Trigger password reset for all migrated users | >95% delivery rate | CRITICAL |
| MIG-11 | User clicks reset link | Click Supabase password reset link from email | Password set flow works, user can login | CRITICAL |
| MIG-12 | User ignores reset email | User doesn't reset password, tries old password | Login fails, "forgot password" link available | HIGH |

---

## Test Execution Checklist

### Pre-Cutover (run against Base44 mock/live)
- [ ] All AUTH-* tests pass
- [ ] All PERM-* tests pass
- [ ] All EDGE-* tests pass
- [ ] ROLL-08 (mock mode still works)

### During Cutover (run against Supabase)
- [ ] All AUTH-* tests pass with Supabase auth
- [ ] All RLS-* tests pass
- [ ] All STOR-* tests pass
- [ ] All MIG-* tests pass
- [ ] ROLL-01 through ROLL-05 verified

### Post-Cutover (production verification)
- [ ] All CASE-* tests pass
- [ ] All MSG-* tests pass
- [ ] All CIRCLE-* tests pass
- [ ] All CONTENT-* tests pass
- [ ] All SESS-* tests pass
- [ ] ROLL-10 (source data intact)
- [ ] Monitor error rates for 24h
