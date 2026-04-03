# Base44 Dependency Audit

> Generated 2026-04-02. Source: reverse-engineered from all files in `src/` and `base44/functions/`.
> No schema files exist — all entity fields are inferred from property access in code.

---

## 1. SDK Imports

### Frontend (src/)

| File | Line | Import | Purpose |
|------|------|--------|---------|
| `src/api/base44Client.js` | 1 | `import { createClient } from '@base44/sdk'` | SDK client instantiation |
| `src/api/base44Client.js` | 5 | `import { base44 as mockClient } from './base44MockClient.js'` | Mock fallback (static, tree-shaken) |
| `src/lib/AuthContext.jsx` | 4 | `import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client'` | Direct HTTP client for public settings API |
| `src/lib/AuthContext.jsx` | 5 | `import { MOCK_USER_DATA, MOCK_PUBLIC_SETTINGS } from '@/api/base44MockClient.js'` | Mock auth data |
| `vite.config.js` | 1 | `import base44 from "@base44/vite-plugin"` | Page auto-registration, HMR, nav tracking |

**Package versions (package.json):**
- `@base44/sdk`: ^0.8.24
- `@base44/vite-plugin`: ^1.0.6

### Backend (base44/functions/)

All 56 functions import `createClientFromRequest` from `@base44/sdk` at pinned versions:

| SDK Version | Function Count | Functions |
|-------------|---------------|-----------|
| 0.8.6 | 18 | activateAttorney, activateFromApplication, applyToNetwork, disableLawyer, generateLegacyReport, joinNetwork, notifyAdminNewLawyer, rejectLawyer, rejectLawyerApplication, reinstateLawyer, requestMoreInfo, resendActivation, sendApplicationEmails, sendApprovalEmail, sendEmailOtp, sendVerificationEmail, submitLawyerApplication, verifyEmailOtp |
| 0.8.20 | 24 | acceptCase, approveLawyer, createCircleInvitation, deleteCircleFile, finalizeActivation, getCasesForLawyer, getDirectInbox, getDirectThread, joinLawyerNetwork, notifyCircleMessage, registerActivation, reviewLawyerApplication, searchNetworkAttorneys, sendDirectMessage, startDirectThread, uploadDirectMessageFile, and others |
| 0.8.21 | 14 | acceptCircleInvite, createDocumentVersion, createSetupIntent, createSubscriptionCheckout, publicLawyerSignup, requestDocumentSignatures, sendCircleInviteEmail, signDocument, stripeWebhook, submitCase, trackDocumentChanges, uploadCircleDocument, uploadCircleFile, approveLawyerApplication |

---

## 2. Auth Usage

### Frontend — base44.auth.* calls

| Method | Call Sites | Key Files |
|--------|-----------|-----------|
| `auth.me()` | ~47 calls across 34 files | LawyerLogin, AdminLogin, LawyerOnboarding, LawyerDashboard, AuthContext, every admin page |
| `auth.isAuthenticated()` | ~24 calls across 18 files | LawyerLogin, AdminLogin, MassTortDetail, LawyerOnboarding, every authenticated page |
| `auth.loginViaEmailPassword()` | 6 calls across 5 files | LawyerLogin:60, LawyerPortalLogin:81, Activate (auto-login) |
| `auth.logout()` | ~16 calls across 12 files | AuthContext:119/122, AppSidebar, AdminSidebar, LawyerLogin:35, LawyerOnboarding |
| `auth.redirectToLogin()` | 3 calls across 3 files | AdminLogin:53, AuthContext:128 |
| `auth.verifyOtp()` | 2 calls | VerifyEmail:40, AdminLogin:85 |
| `auth.resendOtp()` | 2 calls | VerifyEmail:67, AdminLogin:107 |
| `auth.resetPassword()` | 1 call | SetPassword:51 |
| `auth.updateMe()` | 4 calls across 3 files | LawyerSettings:263/387, LawyerOnboarding:92 |
| `auth.register()` | 0 frontend calls | Backend-only (publicLawyerSignup, activateAccount, etc.) |

### Frontend — base44.users.*

| Method | File | Line | Context |
|--------|------|------|---------|
| `base44.users.inviteUser(email, 'user')` | AdminNetworkReview.jsx | 97 | Invite approved applicant to platform |

### Backend — auth patterns

| Pattern | Function Count | Examples |
|---------|---------------|----------|
| `base44.auth.me()` → admin role check | 21 functions | approveLawyer, disableLawyer, inviteAttorney, reviewLawyerApplication |
| `base44.auth.me()` → user check only | 18 functions | acceptCase, sendDirectMessage, uploadCircleFile |
| No auth (public) | 17 functions | activateAccount, publicLawyerSignup, sendEmailOtp, stripeWebhook |
| `base44.auth.register()` | 5 functions | publicLawyerSignup, activateAccount, registerActivation, activateFromApplication, joinLawyerNetwork |
| `base44.users.inviteUser()` | 6 functions | resendActivation, inviteAttorney, inviteAdminUser, activateAttorney, upsertLawyer |

---

## 3. Data / Entity Reads and Writes

### Frontend — Entity Access by Feature Area

#### Onboarding & Auth
| Entity | Methods | Files |
|--------|---------|-------|
| LawyerProfile | filter(user_id) | LawyerOnboarding, LawyerLogin, LawyerPortalLogin, LawyerDashboard, LawyerSettings |
| LawyerApplication | list, filter(email, status), update | AdminApplications, AdminLawyers, AdminNetworkReview, LawyerSettings |
| AuditLog | create | LawyerLogin, LawyerPortalLogin, LawyerOnboarding, ForgotPassword, ResetPassword |
| ConsentLog | create | FindLawyer, LawyerSettings |
| User | list, update, delete | AdminLawyers, AdminTeam, FindLawyer |

#### Case Exchange
| Entity | Methods | Files |
|--------|---------|-------|
| Case | list, filter(status, id), create, update | AdminCases, AdminDashboard, AdminLeadDetail, CaseDetail, CaseExchange, MyCases |
| Lead | list, filter(status, id), create, update | AdminLeads, AdminLeadDetail, AdminLeadDocketSync, AdminDashboard, FindLawyer |
| LawyerProfile | filter(user_id) | CaseExchange, CaseDetail (approval checks) |

#### Messaging
| Entity | Methods | Files |
|--------|---------|-------|
| DirectMessage | filter, update, **subscribe** | DirectMessageThread, DirectMessages, AppSidebar |
| DirectMessageParticipant | **subscribe** | AppSidebar |
| LawyerProfile | filter(user_id) | DirectMessages, DirectMessageThread (name resolution) |

#### Circles
| Entity | Methods | Files |
|--------|---------|-------|
| LegalCircle | list, filter(id, is_active), create, update | AdminCircles, CreateGroup, Groups, GroupDetail, GroupInvitations |
| LegalCircleMember | list, filter(circle_id, user_id, status), create, update | AdminCircles, CircleMembers, Groups, GroupDetail, SubmitCaseModal |
| LegalCircleCase | list, filter(circle_id), update | AdminCircles, CircleCases |
| LegalCircleInvitation | filter(circle_id, invitee_email, status), update | CircleMembers, Groups, GroupInvitations |
| CircleMessage | list, filter(circle_id), create, update, **subscribe** | AdminCircles, CircleChat |
| CircleNotification | filter, update, **subscribe** | NotificationBell |
| CircleDocument | filter(circle_id) | CircleDocuments |
| CircleFile | filter(circle_id, is_deleted), create | CircleChat, CircleResources |

#### Content & CMS
| Entity | Methods | Files |
|--------|---------|-------|
| BlogPost | list, filter(status, slug, id), create, update, delete | AdminBlog, AdminBlogEdit, Blog, LawyerBlog, LawyerBlogDetail, PublicBlogDetail |
| Resource | list, filter(status, slug, id), create, update, delete | AdminResources, AdminResourceEdit, LawyerResources, LawyerResourceDetail |
| ResourceEvent | list, create | AdminResources, LawyerResources, LawyerResourceDetail |
| MassTort | filter(is_published, slug) | MassTorts, MassTortDetail |
| ContentPost | filter(is_published, slug) | Content, ContentDetail, MassTortDetail |
| Popup | list, filter(status, id), create, update, delete | AdminPopups, AdminPopupEdit, PopupModal |
| PopupImpression | list, filter(popup_id), create, update | AdminPopups, PopupModal |

### Backend — Entity Access by Scope

**User-scoped (`base44.entities.*`)** — RLS enforced:
- Case, LawyerProfile (read in getCasesForLawyer, acceptCase)
- DirectMessageThread, DirectMessage, DirectMessageFile (read in getDirectThread)
- CircleDocument, DocumentVersion, DocumentSignature (read/write in document functions)

**Admin-scoped (`base44.asServiceRole.entities.*`)** — bypasses RLS:
- User: read/write in 28+ functions
- LawyerProfile: read/write in 25+ functions
- LawyerApplication: read/write in 18 functions
- ActivationToken: read/write in 8 functions
- All circle entities: membership, invitations, notifications, files
- All messaging entities: threads, participants, messages, files
- AuditLog: write-only in 25+ functions

---

## 4. Backend Function Usage

### Frontend → Backend function calls (`base44.functions.invoke`)

#### Onboarding & Auth (12 functions)
| Function | Frontend Call Sites |
|----------|-------------------|
| `publicLawyerSignup` | JoinLawyerNetwork:118, JoinNetwork:108 |
| `submitLawyerApplication` | ForLawyers:114 |
| `activateAccount` | Activate:96 |
| `resendActivation` | Activate:56, AdminLawyers:237/290 |
| `sendEmailOtp` | EmailVerifyModal:80, EmailVerifyStep:29, EmailVerificationModal:112 |
| `verifyEmailOtp` | EmailVerifyModal:58, EmailVerifyStep:48, EmailVerificationModal:88 |
| `sendApplicationEmails` | FindLawyer:171/243/315, CaseDetail:124 |
| `reviewLawyerApplication` | AdminApplications:100 |
| `approveLawyer` | AdminLawyers:199 |
| `approveLawyerApplication` | AdminLawyers:158 |
| `inviteAttorney` | AdminLawyers:319 |
| `inviteAdminUser` | AdminTeam:105 |

#### Cases & Leads (5 functions)
| Function | Frontend Call Sites |
|----------|-------------------|
| `getCasesForLawyer` | CaseExchange:69, LawyerDashboard:90 |
| `acceptCase` | CaseDetail:120 |
| `submitCase` | CircleCases:147, SubmitCaseModal:69 |
| `retrySyncLead` | AdminLeadDocketSync:109 |
| `generateLegacyReport` | AdminLawyers:300 |

#### Messaging (5 functions)
| Function | Frontend Call Sites |
|----------|-------------------|
| `getDirectInbox` | DirectMessages:60, AppSidebar:32 |
| `getDirectThread` | DirectMessageThread:103 |
| `sendDirectMessage` | DirectMessageThread:222 |
| `startDirectThread` | CircleMembers:15, DirectMessages:91 |
| `uploadDirectMessageFile` | DirectMessageThread:235 |

#### Circles (10 functions)
| Function | Frontend Call Sites |
|----------|-------------------|
| `createCircleInvitation` | CircleMembers:86 |
| `acceptCircleInvite` | GroupInvitations:74 |
| `sendCircleInviteEmail` | CircleMembers:116 |
| `notifyCircleMessage` | CircleChat:254 |
| `uploadCircleFile` | CircleChat:226, CircleResources:110 |
| `deleteCircleFile` | CircleResources:124 |
| `uploadCircleDocument` | CircleDocuments:313 |
| `getDocumentHistory` | CircleDocuments:19 |
| `requestDocumentSignatures` | CircleDocuments:192 |
| `searchNetworkAttorneys` | CircleMembers:51, NewMessageModal:17 |

#### Admin (5 functions)
| Function | Frontend Call Sites |
|----------|-------------------|
| `disableLawyer` | AdminLawyers:215/277 |
| `reinstateLawyer` | AdminLawyers:227 |
| `rejectLawyerApplication` | AdminLawyers:177 |
| `requestMoreInfo` | AdminLawyers:250 |
| `createSubscriptionCheckout` | LawyerSettings:366 |
| `createSetupIntent` | (StripeCardSetup component) |

### Backend-only functions (not invoked from frontend)
| Function | Trigger |
|----------|---------|
| `emailTemplates` | Imported by other functions (shared HTML helpers) |
| `joinNetwork` | Delegates to `applyToNetwork` |
| `upsertLawyer` | Called by other functions internally |
| `notifyAdminNewLawyer` | Called by other functions |
| `sendApprovalEmail` | Called by other functions |
| `finalizeActivation` | Called after OTP verification |
| `registerActivation` | Called from Activate page flow |
| `resolveVerifyEmail` | Called from VerifyEmail page |
| `activateAttorney` | Called from invitation flow |
| `activateFromApplication` | Called from application activation flow |
| `stripeWebhook` | Called by Stripe (webhook) |
| `signDocument` | Called from CircleDocuments |
| `trackDocumentChanges` | Called from CircleDocuments |
| `createDocumentVersion` | Called from CircleDocuments |

---

## 5. File Storage Usage

### Frontend upload call sites (9 calls, 8 files)

| File | Line | Method | Stores In |
|------|------|--------|-----------|
| LawyerOnboarding.jsx | 242 | `Core.UploadFile({ file })` | `User.profile_photo_url` |
| LawyerSettings.jsx | 206 | `Core.UploadFile({ file })` | `User.profile_photo_url` |
| AdminBlogEdit.jsx | 169 | `Core.UploadFile({ file })` | `BlogPost.featured_image_url` |
| AdminBlogEdit.jsx | 178 | `Core.UploadFile({ file })` | `BlogPost.pdf_download_url` |
| AdminResourceEdit.jsx | 68 | `Core.UploadFile({ file })` | `Resource.file_url` |
| AdminResourceEdit.jsx | 83 | `Core.UploadFile({ file })` | `Resource.pdf_download_url` |
| AdminPopupEdit.jsx | 130 | `Core.UploadFile({ file })` | `Popup.image_url` |
| RichTextEditor.jsx | 19 | `Core.UploadFile({ file })` | Inline in `BlogPost.body` HTML |

### Backend upload functions (5 functions)

| Function | Method | Creates Entity |
|----------|--------|---------------|
| `uploadDirectMessageFile` | `asServiceRole.integrations.Core.UploadFile` | DirectMessageFile |
| `uploadCircleFile` | `asServiceRole.integrations.Core.UploadFile` | CircleFile |
| `uploadCircleDocument` | `integrations.Core.UploadFile` | CircleDocument + DocumentVersion |
| `createDocumentVersion` | `integrations.Core.UploadFile` | DocumentVersion |

### Backend email via Core (5 functions)

| Function | Method | Recipient |
|----------|--------|-----------|
| `activateAttorney` | `asServiceRole.integrations.Core.SendEmail` | New attorney |
| `notifyAdminNewLawyer` | `asServiceRole.integrations.Core.SendEmail` | All admin users |
| `sendApprovalEmail` | `asServiceRole.integrations.Core.SendEmail` | Approved lawyer |
| `sendVerificationEmail` | `asServiceRole.integrations.Core.SendEmail` | Admin (info@taylormadelaw.com) |
| `upsertLawyer` | `asServiceRole.integrations.Core.SendEmail` | Lawyer (activation email) |

---

## 6. Environment Variables

### Frontend (Vite — `import.meta.env`)

| Variable | File | Purpose |
|----------|------|---------|
| `VITE_BASE44_APP_ID` | src/lib/app-params.js:43 | Base44 application identifier |
| `VITE_BASE44_FUNCTIONS_VERSION` | src/lib/app-params.js:46 | Backend functions version |
| `VITE_BASE44_APP_BASE_URL` | src/lib/app-params.js:47 | Base44 API endpoint |
| `VITE_USE_MOCKS` | src/api/base44Client.js:12, src/lib/AuthContext.jsx:27 | Toggle mock mode |

### Build-time (process.env)

| Variable | File | Purpose |
|----------|------|---------|
| `BASE44_LEGACY_SDK_IMPORTS` | vite.config.js:12 | Enable legacy `@/integrations` import paths |

### Backend (Deno.env.get)

| Variable | Functions Using It | Purpose |
|----------|--------------------|---------|
| `RESEND_API_KEY` | 25+ functions | Resend email API authentication |
| `STRIPE_SECRET_KEY` | createSetupIntent, createSubscriptionCheckout, stripeWebhook | Stripe API authentication |
| `STRIPE_PUBLISHABLE_KEY` | createSetupIntent, createSubscriptionCheckout | Client-side Stripe key (returned to frontend) |
| `STRIPE_WEBHOOK_SECRET` | stripeWebhook | Webhook signature verification |
| `BASE44_APP_ID` | createSetupIntent, createSubscriptionCheckout, stripeWebhook | Stripe metadata |
| `APP_URL` | reviewLawyerApplication | Email link base URL (defaults to `https://app.taylormadelaw.com`) |

---

## 7. Hardcoded App IDs, Tokens, and URLs

### Stripe

| Value | File | Line |
|-------|------|------|
| `price_1TCqcIBI0mAZLD5som54aFFB` | base44/functions/createSubscriptionCheckout/entry.ts | ~36 | Subscription price ID |

### Lead Docket

| Value | File | Line |
|-------|------|------|
| `https://taylormadelaw.leaddocket.com/opportunities/form/1` | src/pages/FindLawyer.jsx | 130 |

### WordPress CDN (25+ references across 12+ files)

| URL Pattern | Files |
|-------------|-------|
| `https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png` | LawyerOnboarding, Activate, SetPassword, VerifyEmail |
| `https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Logo_Stacked_Cream-scaled.png` | AdminSidebar |
| `https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp` | AppSidebar, PublicNav, FindLawyer |
| `https://taylormadelaw.com/wp-content/uploads/2025/06/cropped-TML-concierge.png` | AdminSidebar |
| `https://taylormadelaw.com/wp-content/uploads/2025/11/Connections.jpg` | Home |
| `https://taylormadelaw.com/wp-content/uploads/2025/11/tmpm185313i.webp` | Home |
| `https://taylormadelaw.com/wp-content/uploads/2025/11/lawyer-meeting.jpg` | Home |

### Email addresses (hardcoded in backend functions)

| Address | Usage |
|---------|-------|
| `noreply@taylormadelaw.com` | Sender for most Resend emails |
| `no-reply@taylormadelaw.com` | Sender variant in some functions |
| `notifications@taylormadelaw.com` | Sender for circle notifications |
| `admin@taylormadelaw.com` | Recipient for admin alerts |
| `support@taylormadelaw.com` | Displayed in email footers, error messages |
| `info@taylormadelaw.com` | Recipient in sendVerificationEmail |
| `pburns@cochrantexas.com` | Cochran Firm routing (AdminLeadDetail:301) |

### App URLs (hardcoded in backend functions)

| URL | Functions | Purpose |
|-----|-----------|---------|
| `https://app.taylormadelaw.com` | 10+ functions | Base URL for email links (login, activate, group invitations) |
| `https://taylormadelaw.com/terms` | ForLawyers, JoinNetwork | Terms of service link |
| `https://taylormadelaw.com/privacy` | ForLawyers, JoinNetwork | Privacy policy link |
| `https://taylormadelaw.com/referral-agreement` | ForLawyers, JoinNetwork | Referral agreement link |

---

## 8. Real-time / Subscription Usage

### Active subscriptions (frontend)

| Entity | File | Line | Event Handling |
|--------|------|------|---------------|
| `DirectMessage` | DirectMessageThread.jsx | ~155 | `create` → append message to local state; `update` → update in-place (soft delete) |
| `DirectMessage` | DirectMessages.jsx | ~71 | any → invalidate inbox query (refetch threads) |
| `DirectMessage` | AppSidebar.jsx | ~39 | `create` where sender ≠ me and not viewing thread → increment unread badge |
| `DirectMessageParticipant` | AppSidebar.jsx | ~51 | `update` where user_id = me → re-fetch unread count (read receipt) |
| `CircleMessage` | CircleChat.jsx | ~92 | `create` → append; `update` → update; `delete` → remove |
| `CircleNotification` | NotificationBell.jsx | ~22 | `create` → add to list; `update` → update read status; `delete` → remove |

### Polling fallbacks

| Query | Interval | File |
|-------|----------|------|
| `getDirectInbox` | 8 seconds | DirectMessages.jsx:63 |
| `CircleFile.filter` | 15 seconds | CircleResources.jsx |
| `CircleDocument.filter` | 10 seconds | CircleDocuments.jsx |

### Subscription protocol

Unknown. `base44.entities.X.subscribe(callback)` returns an unsubscribe function. Whether the SDK uses WebSocket, SSE, or long-polling is abstracted and not visible in code.

---

## 9. Summary by Migration Effort

### Must replace (Base44-specific, no portable equivalent)

| Dependency | Call Sites | Effort |
|------------|-----------|--------|
| `base44.entities.*` CRUD | 237+ calls across 55 files | Very High — need full API + DB layer |
| `base44.auth.*` | 100+ calls across 34 files | Very High — need auth system (JWT + session) |
| `base44.functions.invoke()` | 60+ calls invoking 37 functions | Very High — need API routes for each function |
| `base44.entities.*.subscribe()` | 6 subscriptions across 5 files | High — need WebSocket/SSE server |
| `base44.asServiceRole.entities.*` | All 56 backend functions | High — need admin middleware bypassing RLS |
| `base44.integrations.Core.UploadFile` | 9 frontend + 5 backend calls | Medium — replace with S3/local storage |
| `base44.integrations.Core.SendEmail` | 5 backend functions | Low — already have Resend in parallel |
| `base44.users.inviteUser()` | 1 frontend + 6 backend calls | Medium — need user creation + email flow |
| `base44.appLogs.logUserInApp()` | 1 call (NavigationTracker) | Low — optional analytics, can drop |
| `createAxiosClient` (SDK internal) | 1 call (AuthContext) | Low — replace with fetch/axios |
| `@base44/vite-plugin` | vite.config.js | Medium — need custom page registration or manual routes |

### Can keep as-is (portable)

| Dependency | Notes |
|------------|-------|
| Stripe SDK | Works with any backend. Just needs new webhook endpoint. |
| Resend API | HTTP-based. 24+ functions already use it directly via `fetch()`. |
| Lead Docket webhook | Single `fetch()` POST in FindLawyer.jsx. Portable. |
| All React/Tailwind/shadcn frontend code | No Base44 dependency in rendering layer. |
