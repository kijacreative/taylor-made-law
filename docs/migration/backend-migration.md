# Backend Migration: Base44 Functions → Supabase

> Written 2026-04-02. Classification and plan only — no production traffic changes.

---

## Function Classification

All 56 Base44 Deno functions classified into 4 categories based on what they do:

### Category 1: Edge Function Candidates (28)

Functions with complex business logic, multi-step workflows, external service calls, or auth+authorization checks that can't be expressed as pure SQL.

| Function | Why Edge Function | External Services | Auth |
|----------|------------------|-------------------|------|
| **publicLawyerSignup** | Multi-step: create auth account, application, profile, send emails | Resend | Public |
| **submitLawyerApplication** | Multi-step: upsert user, create application, generate activation token, send emails | Resend | Public |
| **activateAccount** | Token validation, account registration, profile creation | — | Public (token) |
| **activateAttorney** | Token validation, user creation, profile creation, consent log, email | Core.SendEmail | Public (token) |
| **activateFromApplication** | Application token validation, user + profile creation | — | Public (token) |
| **registerActivation** | Token validation, auth.register | — | Public (token) |
| **finalizeActivation** | Post-OTP: set user status, update application | — | Public |
| **approveLawyer** | Admin action: update user + profile + send approval email | Resend | Admin |
| **approveLawyerApplication** | Admin action: update application + user + profile + auto-add to circle | Resend | Admin |
| **reviewLawyerApplication** | Admin action: 3 sub-actions (approve/disable/request info) | Resend | Admin |
| **disableLawyer** | Admin action: set disabled status + send email | Resend | Admin |
| **reinstateLawyer** | Admin action: reverse disable + send email | Resend | Admin |
| **rejectLawyer** | Admin action: disable + restrict profile + send email | Resend | Admin |
| **rejectLawyerApplication** | Admin action: reject application + send email | Resend | Admin |
| **requestMoreInfo** | Admin action: update user + send email | Resend | Admin |
| **inviteAttorney** | Admin action: create user + send activation email | Resend, base44.users | Admin |
| **inviteAdminUser** | Admin action: create admin user + send invite email | Resend | Admin |
| **getCasesForLawyer** | Conditional data return (teaser vs full based on approval status) | — | User |
| **acceptCase** | Multi-step: verify approval + paid + update case + audit log | — | User (approved+paid) |
| **startDirectThread** | Duplicate check + create thread + 2 participants | — | User (approved) |
| **sendDirectMessage** | Create message + update thread + notify participants | — | User (approved) |
| **createCircleInvitation** | Verify membership + create invitation + notification + email | Resend | User (member) |
| **sendCircleInviteEmail** | Send branded invite email (network or non-network) | Resend | User |
| **notifyCircleMessage** | Notify all circle members of new message | Resend | User |
| **createSubscriptionCheckout** | Create Stripe customer + checkout session | Stripe | User |
| **createSetupIntent** | Create Stripe customer + setup intent | Stripe | User |
| **stripeWebhook** | Verify Stripe signature + update subscription status | Stripe | Public (webhook) |
| **generateLegacyReport** | Export all lawyer data as report | — | Admin |

### Category 2: Postgres Function / RPC Candidates (10)

Simple CRUD operations with authorization that can be expressed as Postgres functions called via `supabase.rpc()`. These are faster than Edge Functions and don't need a Deno runtime.

| Function | Why Postgres | Logic |
|----------|-------------|-------|
| **getDirectInbox** | Query + join + unread calculation | Select threads + participants + compute unread per thread |
| **getDirectThread** | Query + join + mark-as-read side effect | Select messages + files, update participant last_read_at |
| **getDocumentHistory** | Query + join | Select document + versions + signatures |
| **searchNetworkAttorneys** | Query with text search | Filter approved profiles by name/email/firm substring |
| **submitCase** | Insert with membership verification | Insert case/circle_case after checking profile status |
| **acceptCircleInvite** | Update + insert | Update invitation status + create member record |
| **signDocument** | Update with authorization | Update signature + compute overall document status |
| **trackDocumentChanges** | Update | Update document version + document flags |
| **requestDocumentSignatures** | Insert batch | Create signature requests for multiple signers |
| **deleteCircleFile** | Update with authorization | Soft-delete file (check uploader or admin role) |

### Category 3: Cron / Background Task Candidates (2)

| Function | Why Cron | Schedule |
|----------|---------|----------|
| **retrySyncLead** | Retry failed Lead Docket syncs | Every 15 min or on-demand |
| (future) **expire_tokens** | Clean up expired activation tokens + OTPs | Daily |

### Category 4: Frontend-Only / Eliminated (16)

Functions whose logic is either trivially replaced by direct Supabase client calls, already handled by Supabase Auth, or are internal helpers that get absorbed into Edge Functions.

| Function | Reason | Replacement |
|----------|--------|-------------|
| **emailTemplates** | Shared HTML helpers — not a function, a utility | Import as shared module in Edge Functions |
| **joinNetwork** | Delegates to applyToNetwork | Remove; call applyToNetwork directly |
| **upsertLawyer** | Internal helper called by other functions | Absorbed into Edge Functions that use it |
| **notifyAdminNewLawyer** | Internal: send email to admins | Absorbed into signup Edge Functions |
| **sendApprovalEmail** | Internal: send branded email | Absorbed into approve Edge Functions |
| **sendVerificationEmail** | Send email verification | Replaced by Supabase Auth email verification |
| **sendEmailOtp** | Custom OTP generation + email | Replaced by Supabase Auth OTP or kept as Edge Function |
| **verifyEmailOtp** | Custom OTP verification | Replaced by Supabase Auth OTP verify |
| **resolveVerifyEmail** | Token → email lookup | Simple Supabase query from frontend |
| **resendActivation** | Re-send activation email | `supabase.auth.resend()` or Edge Function |
| **sendApplicationEmails** | Generic email sending | Direct Resend API call from Edge Function |
| **applyToNetwork** | Create application + send admin alert | Absorbed into publicLawyerSignup Edge Function |
| **joinLawyerNetwork** | Variant of publicLawyerSignup | Absorbed into publicLawyerSignup Edge Function |
| **uploadDirectMessageFile** | File upload + metadata record | Direct Supabase Storage upload + insert from frontend |
| **uploadCircleFile** | File upload + metadata record | Direct Supabase Storage upload + insert from frontend |
| **uploadCircleDocument** | File upload + document + version records | Edge Function (multi-step) or direct from frontend |
| **createDocumentVersion** | File upload + version record + update document | Edge Function (multi-step) |

---

## Summary by Category

| Category | Count | Where They Run |
|----------|-------|----------------|
| Edge Functions | 28 | `supabase/functions/` (Deno runtime) |
| Postgres Functions (RPC) | 10 | SQL in migrations, called via `supabase.rpc()` |
| Cron / Background | 2 | `pg_cron` or Supabase scheduled functions |
| Eliminated / Absorbed | 16 | Removed; logic absorbed into Edge Functions, Supabase Auth, or direct client calls |
| **Total** | **56** | |

---

## Edge Function Grouping

Instead of 28 individual functions, group by domain for maintainability:

```
supabase/functions/
  auth-signup/              — publicLawyerSignup, submitLawyerApplication, activateAccount,
                              activateAttorney, activateFromApplication, registerActivation,
                              finalizeActivation
  admin-lawyers/            — approveLawyer, approveLawyerApplication, reviewLawyerApplication,
                              disableLawyer, reinstateLawyer, rejectLawyer, rejectLawyerApplication,
                              requestMoreInfo, inviteAttorney, inviteAdminUser, generateLegacyReport
  cases/                    — getCasesForLawyer, acceptCase
  messaging/                — startDirectThread, sendDirectMessage
  circles/                  — createCircleInvitation, sendCircleInviteEmail, notifyCircleMessage
  stripe/                   — createSubscriptionCheckout, createSetupIntent, stripeWebhook
  _shared/                  — email templates, Resend client, shared utilities
```

7 Edge Function folders + 1 shared utilities folder.

---

## Postgres Function Definitions (RPC)

These will be added as a new migration file (`00010_rpc_functions.sql`):

| RPC Function | Input | Returns | Key Logic |
|-------------|-------|---------|-----------|
| `get_direct_inbox(p_user_id uuid)` | user ID | threads[] with unread counts | Join threads + participants, compute unread |
| `get_direct_thread(p_thread_id uuid, p_user_id uuid)` | thread + user ID | messages[] with attachments | Join messages + files, update last_read_at |
| `search_attorneys(p_query text, p_exclude_id uuid)` | search string + self ID | profiles[] | ilike on name/email/firm, limit 10 |
| `submit_case_to_circle(p_circle_id uuid, ...)` | case fields | new case record | Verify membership, insert circle_case |
| `accept_circle_invite(p_invite_id uuid, p_user_id uuid)` | invite + user | success | Update invite, create member |
| `sign_document(p_sig_id uuid, p_user_id uuid, ...)` | signature data | doc status | Update signature, recompute doc status |
| `track_doc_changes(p_doc_id uuid, p_changes jsonb)` | document + changes | success | Update version + document flags |
| `request_signatures(p_doc_id uuid, p_signers jsonb, ...)` | document + signers | sig IDs | Insert batch signature requests |
| `delete_circle_file(p_file_id uuid, p_user_id uuid)` | file + user | success | Check ownership/admin, soft-delete |
| `get_document_history(p_doc_id uuid)` | document ID | versions + signatures | Join document + versions + signatures |

---

## Environment Variables for Edge Functions

| Variable | Current Location | Supabase Location |
|----------|-----------------|-------------------|
| `RESEND_API_KEY` | Base44 dashboard | Supabase project secrets (`supabase secrets set`) |
| `STRIPE_SECRET_KEY` | Base44 dashboard | Supabase project secrets |
| `STRIPE_PUBLISHABLE_KEY` | Base44 dashboard | Supabase project secrets |
| `STRIPE_WEBHOOK_SECRET` | Base44 dashboard | Supabase project secrets |
| `APP_URL` | Base44 dashboard | Supabase project secrets |

---

## File Upload Migration

### Current: Base44 Core.UploadFile
- 9 frontend calls + 5 backend functions
- Returns `{ file_url }` (permanent public URL)
- No auth gate on file URLs

### Target: Supabase Storage
- Frontend uploads directly to Supabase Storage buckets
- Backend Edge Functions upload via service_role for protected buckets
- Returns public URL for public buckets, signed URL for private buckets

### Upload replacement map

| Current Call Site | Bucket | New Method |
|-------------------|--------|------------|
| Profile photo (LawyerOnboarding, LawyerSettings) | `avatars` | `supabase.storage.from('avatars').upload(path, file)` |
| Blog images (AdminBlogEdit) | `content` | `supabase.storage.from('content').upload(path, file)` |
| Resource files (AdminResourceEdit) | `content` | `supabase.storage.from('content').upload(path, file)` |
| Popup images (AdminPopupEdit) | `content` | `supabase.storage.from('content').upload(path, file)` |
| Blog inline images (RichTextEditor) | `content` | `supabase.storage.from('content').upload(path, file)` |
| DM file attachments | `documents` | `supabase.storage.from('documents').upload(path, file)` + insert dm_file record |
| Circle file uploads | `documents` | `supabase.storage.from('documents').upload(path, file)` + insert circle_file record |
| Circle documents | `documents` | Edge Function: upload + create document + version records |

---

## Scaffolded Structure

```
supabase/
  functions/
    auth-signup/index.ts       — signup, activation, finalization
    admin-lawyers/index.ts     — approve, reject, disable, invite
    cases/index.ts             — getCasesForLawyer, acceptCase
    messaging/index.ts         — startDirectThread, sendDirectMessage
    circles/index.ts           — invitations, notifications
    stripe/index.ts            — checkout, setup intent, webhook
    _shared/
      resend.ts                — Resend email client
      email-templates.ts       — HTML email templates
      cors.ts                  — CORS headers
  migrations/
    00001-00009                — existing table migrations
    00010_rpc_functions.sql    — Postgres RPC functions (to be created)
```
