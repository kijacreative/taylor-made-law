# Domain Model

> Generated 2026-04-02. All schemas inferred from code — no schema definitions exist in the Base44 dashboard or anywhere in the repo. Fields marked [inferred] throughout.

---

## 1. Entity List (31 entities)

### Core Identity
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **User** | Auth identity, role, status, subscription | ~35 |
| **LawyerProfile** | Extended attorney profile (1:1 with User) | ~25 |
| **LawyerApplication** | Registration pipeline (linked by email, not FK) | ~25 |

### Case Exchange
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **Case** | Case marketplace listings | ~20 |
| **Lead** | Inbound client intake from FindLawyer | ~20 |

### Legal Circles
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **LegalCircle** | Collaboration groups | ~15 |
| **LegalCircleMember** | Group membership (M:N junction) | ~12 |
| **LegalCircleCase** | Cases shared within circles | ~15 |
| **LegalCircleInvitation** | Circle invite records | ~12 |

### Messaging
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **DirectMessageThread** | DM conversations (2-party) | ~8 |
| **DirectMessage** | Individual messages | ~10 |
| **DirectMessageFile** | DM file attachments | ~10 |
| **DirectMessageParticipant** | Thread membership + read tracking | ~6 |
| **CircleMessage** | Group chat messages | ~10 |
| **CircleNotification** | In-app notifications | ~10 |

### Documents
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **CircleDocument** | Versioned shared documents | ~18 |
| **DocumentVersion** | Document revision history | ~14 |
| **DocumentSignature** | E-signature tracking | ~14 |
| **CircleFile** | Group file uploads (chat + library) | ~12 |

### Content & CMS
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **BlogPost** | Blog articles and white papers | ~20 |
| **ContentPost** | Platform updates / legal news | ~12 |
| **Resource** | Downloadable resources for attorneys | ~18 |
| **ResourceEvent** | Download / view tracking | ~6 |
| **MassTort** | Mass tort opportunity listings | ~14 |

### Marketing
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **Popup** | In-app announcements and modals | ~20 |
| **PopupImpression** | Popup view / click / dismiss tracking | ~6 |

### Auth & Security
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **ActivationToken** | Account activation codes (SHA-256 hashed) | ~8 |
| **EmailVerificationOtp** | Email OTP codes (SHA-256 hashed) | ~6 |
| **AttorneyInvitation** | Admin-issued attorney invites | ~14 |

### Audit & Compliance
| Entity | Purpose | Est. Fields |
|--------|---------|-------------|
| **AuditLog** | System audit trail | ~7 |
| **ConsentLog** | User consent records | ~8 |
| **Invitation** | Generic invitation (used in FindLawyer attorney referral) | ~6 |

---

## 2. Inferred Relationships

```
User ─────────── 1:1 ──── LawyerProfile          (via user_id FK)
User ─────────── 1:N ──── LawyerApplication       (via email match — NO FK)
User ─────────── 1:N ──── ActivationToken          (via user_id + user_email)
User ─────────── 1:N ──── EmailVerificationOtp     (via email)
User ─────────── 1:N ──── AttorneyInvitation       (via invitee_email)
User ─────────── 1:N ──── AuditLog                 (via actor_email — NO FK)
User ─────────── 1:N ──── ConsentLog               (via user_id)

Lead ─────────── 0:1 ──── Case                     (via lead_id when published from lead)
Case ─────────── 0:1 ──── LawyerProfile            (via accepted_by when accepted)

LegalCircle ──── 1:N ──── LegalCircleMember        (via circle_id)
LegalCircle ──── 1:N ──── LegalCircleCase          (via circle_id)
LegalCircle ──── 1:N ──── LegalCircleInvitation    (via circle_id)
LegalCircle ──── 1:N ──── CircleMessage             (via circle_id)
LegalCircle ──── 1:N ──── CircleNotification        (via circle_id)
LegalCircle ──── 1:N ──── CircleDocument             (via circle_id)
LegalCircle ──── 1:N ──── CircleFile                 (via circle_id)

User ─────────── M:N ──── LegalCircle               (via LegalCircleMember junction)
User ─────────── M:N ──── DirectMessageThread       (via DirectMessageParticipant junction)

DirectMessageThread ── 1:N ── DirectMessage          (via thread_id)
DirectMessageThread ── 1:N ── DirectMessageParticipant (via thread_id)
DirectMessage ──────── 1:N ── DirectMessageFile      (via message_id)

CircleDocument ─────── 1:N ── DocumentVersion        (via document_id)
CircleDocument ─────── 1:N ── DocumentSignature       (via document_id)

Resource ──────────── 1:N ── ResourceEvent            (via resource_id)
Popup ─────────────── 1:N ── PopupImpression          (via popup_id)
CircleMessage ─────── 1:N ── CircleFile               (via message_id, optional)
```

### Relationships with no proper FK (linked by email string match)

| Parent | Child | Link Field | Risk |
|--------|-------|------------|------|
| User | LawyerApplication | `email` (string match) | Breaks if user changes email |
| User | AuditLog | `actor_email` (string) | Breaks if user changes email |
| User | CircleNotification | `user_email` (string) | Stale if email changes |
| User | LegalCircleMember | `user_email` (denormalized) | Stale if email changes |
| User | DirectMessage | `sender_email` (denormalized) | Stale if email changes |

---

## 3. Route / Component to Entity Map

### Public Routes (no auth)

| Route | Component | Entities Read | Entities Written | Functions Invoked |
|-------|-----------|--------------|-----------------|-------------------|
| `/` | Home | — | — | — |
| `/Blog` | Blog | BlogPost | — | — |
| `/PublicBlogDetail` | PublicBlogDetail | BlogPost | — | — |
| `/FindLawyer` | FindLawyer | User | Lead, ConsentLog, AuditLog, Invitation | sendApplicationEmails |
| `/ForLawyers` | ForLawyers | — | — | submitLawyerApplication |
| `/JoinNetwork` | JoinNetwork | — | — | publicLawyerSignup |
| `/join-lawyer-network` | JoinLawyerNetwork | — | — | publicLawyerSignup |
| `/LawyerLogin` | LawyerLogin | — | AuditLog | — (SDK auth) |
| `/login` | LawyerPortalLogin | — | AuditLog | — (SDK auth) |
| `/AdminLogin` | AdminLogin | — | AuditLog | — (SDK auth) |
| `/Activate` | Activate | — | — | activateAccount, resendActivation |
| `/verify-email` | VerifyEmail | — | — | — (SDK auth) |
| `/set-password` | SetPassword | — | — | — (SDK auth) |
| `/ForgotPassword` | ForgotPassword | — | AuditLog | — (Core.SendEmail) |
| `/ResetPassword` | ResetPassword | — | — | — |
| `/terms` | TermsAndConditions | — | — | — |
| `/privacy` | PrivacyPolicy | — | — | — |

### Lawyer Routes (auth required, non-admin)

| Route | Component | Entities Read | Entities Written | Functions Invoked |
|-------|-----------|--------------|-----------------|-------------------|
| `/LawyerDashboard` | LawyerDashboard | LawyerProfile | — | getCasesForLawyer |
| `/CaseExchange` | CaseExchange | LawyerProfile | — | getCasesForLawyer |
| `/CaseDetail` | CaseDetail | LawyerProfile, Case | — | acceptCase, sendApplicationEmails |
| `/MyCases` | MyCases | LawyerProfile | Case (update) | — |
| `/Groups` | Groups | LawyerProfile, LegalCircle, LegalCircleMember, LegalCircleInvitation | — | — |
| `/GroupDetail` | GroupDetail | LawyerProfile, LegalCircle, LegalCircleMember | LegalCircleMember (update) | (child components invoke many) |
| `/GroupInvitations` | GroupInvitations | LawyerProfile, LegalCircleInvitation, LegalCircle | LegalCircleInvitation (update) | acceptCircleInvite |
| `/CreateGroup` | CreateGroup | LawyerProfile | LegalCircle, LegalCircleMember | — |
| `/app/messages` | DirectMessages | LawyerProfile, DirectMessage (subscribe) | — | getDirectInbox, startDirectThread |
| `/app/messages/:threadId` | DirectMessageThread | LawyerProfile, DirectMessage (subscribe) | DirectMessage (update) | getDirectThread, sendDirectMessage, uploadDirectMessageFile |
| `/LawyerSettings` | LawyerSettings | LawyerProfile, LawyerApplication | LawyerProfile, ConsentLog, AuditLog | createSubscriptionCheckout |
| `/LawyerOnboarding` | LawyerOnboarding | LawyerProfile | LawyerProfile, ConsentLog, AuditLog | — (auth.updateMe) |
| `/LawyerBlog` | LawyerBlog | LawyerProfile, BlogPost | — | — |
| `/LawyerBlogDetail` | LawyerBlogDetail | LawyerProfile, BlogPost | — | — |
| `/LawyerResources` | LawyerResources | LawyerProfile, Resource | ResourceEvent | — |
| `/LawyerResourceDetail` | LawyerResourceDetail | LawyerProfile, Resource | ResourceEvent | — |
| `/MassTorts` | MassTorts | LawyerProfile, MassTort | — | — |
| `/MassTortDetail` | MassTortDetail | LawyerProfile, MassTort, ContentPost | — | — |
| `/Content` | Content | LawyerProfile, ContentPost | — | — |
| `/ContentDetail` | ContentDetail | LawyerProfile, ContentPost | — | — |

### Admin Routes (auth + role=admin)

| Route | Component | Entities Read | Entities Written | Functions Invoked |
|-------|-----------|--------------|-----------------|-------------------|
| `/AdminDashboard` | AdminDashboard | Lead, Case, LawyerProfile | — | — |
| `/AdminLeads` | AdminLeads | Lead | — | — |
| `/AdminLeadDetail` | AdminLeadDetail | Lead, AuditLog | Lead, Case, AuditLog | — (Core.SendEmail) |
| `/AdminCases` | AdminCases | Case | Case | — |
| `/AdminLawyers` | AdminLawyers | LawyerApplication, LawyerProfile, User | User, LawyerProfile | approveLawyer, approveLawyerApplication, rejectLawyerApplication, disableLawyer, reinstateLawyer, resendActivation, requestMoreInfo, generateLegacyReport, inviteAttorney |
| `/admin/applications` | AdminApplications | LawyerApplication, LawyerProfile | — | reviewLawyerApplication |
| `/AdminNetworkReview` | AdminNetworkReview | LawyerApplication | LawyerApplication | — (base44.users.inviteUser) |
| `/AdminTeam` | AdminTeam | User | User (delete) | inviteAdminUser |
| `/AdminBlog` | AdminBlog | BlogPost | BlogPost, AuditLog | — |
| `/AdminBlogEdit` | AdminBlogEdit | BlogPost | BlogPost, AuditLog | — (Core.UploadFile) |
| `/AdminResources` | AdminResources | Resource, ResourceEvent | Resource | — |
| `/AdminResourceEdit` | AdminResourceEdit | Resource | Resource | — (Core.UploadFile) |
| `/AdminPopups` | AdminPopups | Popup, PopupImpression | Popup | — |
| `/AdminPopupEdit` | AdminPopupEdit | Popup | Popup | — (Core.UploadFile) |
| `/AdminCircles` | AdminCircles | LegalCircle, LegalCircleMember, LegalCircleCase, CircleMessage | LegalCircle (update) | — |
| `/admin/lead-docket-sync` | AdminLeadDocketSync | Lead | — | retrySyncLead |

### Shared Components (render inside pages)

| Component | Entities Read | Entities Written | Functions |
|-----------|--------------|-----------------|-----------|
| AppSidebar | DirectMessage (subscribe), DirectMessageParticipant (subscribe) | — | getDirectInbox |
| AdminSidebar | Case | — | — |
| NotificationBell | CircleNotification (subscribe) | CircleNotification (update) | — |
| PopupModal | Popup, PopupImpression | PopupImpression | — |
| SubmitCaseModal | LegalCircleMember, LegalCircle | — | submitCase |
| CircleChat | CircleMessage (subscribe), CircleFile | CircleMessage, CircleFile | uploadCircleFile, notifyCircleMessage |
| CircleMembers | LegalCircleMember, LegalCircleInvitation | LegalCircleMember | createCircleInvitation, sendCircleInviteEmail, startDirectThread, searchNetworkAttorneys |
| CircleDocuments | CircleDocument | — | uploadCircleDocument, getDocumentHistory, requestDocumentSignatures |
| CircleResources | CircleFile | — | uploadCircleFile, deleteCircleFile |
| CircleCases | LegalCircleCase | LegalCircleCase (update) | submitCase |
| CircleSettings | — | LegalCircle (update), LegalCircleMember (update) | — |

---

## 4. Public vs Private Entities

### Public (readable without authentication)

| Entity | Public Access Points |
|--------|---------------------|
| BlogPost | Blog.jsx, PublicBlogDetail.jsx — filtered by `is_published: true` |
| ContentPost | (only via authenticated lawyer pages, but no server-side auth on entity read) |
| MassTort | (only via authenticated lawyer pages) |

### Private (require authentication to read)

All other entities require auth. Within authenticated access:

| Entity | Lawyer Access | Admin Access |
|--------|--------------|-------------|
| User | Own record only (via auth.me) | All records (list, update, delete) |
| LawyerProfile | Own record (filter by user_id) | All records |
| Case | Published cases (via getCasesForLawyer) | All cases |
| Lead | No direct access | All leads |
| LawyerApplication | Own record (by email) | All applications |
| DirectMessage | Own threads only | All threads (admin bypass in getDirectThread) |
| LegalCircle | Circles where member | All circles |
| LegalCircleMember | Own memberships | All memberships |
| CircleMessage | Circles where member | All messages |
| CircleDocument | Circles where member | (no admin override visible) |
| AuditLog | No read access | Read by entity filter |
| Popup | Active popups (via PopupModal) | All popups |

### Backend-only entities (never directly queried from frontend)

| Entity | Accessed Only By |
|--------|-----------------|
| ActivationToken | Backend activation functions |
| EmailVerificationOtp | Backend OTP functions |
| AttorneyInvitation | Backend invite/approval functions |
| DocumentSignature | Backend via getDocumentHistory |

---

## 5. Hardcoded Schema Assumptions

### Status enum values used across frontend (no schema enforcement)

**User.user_status** — 7 distinct values found in comparisons:
```
'invited' → 'pending' → 'approved' → 'disabled'
                                   → 'active' (alias for approved in some contexts)
                        → 'active_pending_review'
                        → 'restricted'
```

**User.role** — 2 values: `'admin'`, `'user'`

**User.user_type** — 3 values + null: `'admin'`, `'senior_associate'`, `'junior_associate'`

**User.membership_status** — 3 values: `'paid'`, `'trial'`, `'none'`

**LawyerProfile.status** — 3 values: `'pending'`, `'approved'`, `'restricted'`

**LawyerApplication.status** — 7 values:
```
'pending', 'approved', 'approved_pending_activation', 'active',
'active_pending_review', 'rejected', 'disabled'
```

**Case.status** — 6 values: `'draft'`, `'published'`, `'accepted'`, `'in_progress'`, `'closed'`, `'withdrawn'`

**Lead.status** — 8 values: `'new'`, `'junior_review'`, `'senior_review'`, `'approved'`, `'rejected'`, `'published'`, `'routed_cochran'`, `'closed'`

**Lead.sync_status** — 3 values: `'pending'`, `'sent'`, `'failed'`

**BlogPost.status** — 2 values: `'draft'`, `'published'`

**Resource.status** — 2 values: `'draft'`, `'published'`

**Resource.visibility** — 2 values: `'approved_only'`, `'all_lawyers'`

**Popup.status** — 3 values: `'draft'`, `'active'`, `'inactive'`

**Popup.audience** — 3 values: `'all'`, `'pending'`, `'approved'`

**LegalCircleMember.status** — 4 values: `'active'`, `'pending'`, `'removed'`, `'declined'`

**LegalCircleMember.role** — 3 values: `'admin'`, `'moderator'`, `'member'`

**LegalCircleInvitation.status** — 3 values: `'pending'`, `'accepted'`, `'declined'`

### Hardcoded reference data arrays (DesignTokens.jsx)

| Array | Count | Location |
|-------|-------|----------|
| `PRACTICE_AREAS` | 13 items | DesignTokens.jsx:113-127 |
| `US_STATES` | 51 items (50 states + DC) | DesignTokens.jsx:130-139 |
| `URGENCY_LEVELS` | 4 items | DesignTokens.jsx:142-147 |
| `LEAD_STATUSES` | 8 items with colors | DesignTokens.jsx:150-159 |
| `CASE_STATUSES` | 6 items with colors | DesignTokens.jsx:162-169 |
| `LAWYER_STATUSES` | 4 items with colors | DesignTokens.jsx:172-177 |

### Category arrays hardcoded per page (not centralized)

| Page | Categories | Count |
|------|-----------|-------|
| AdminBlogEdit.jsx:15 | Blog categories | 7 |
| AdminResourceEdit.jsx:8-11 | Resource categories | 10 |
| Content.jsx | Content categories (inline) | ~5 |
| AdminApplications.jsx:22-28 | Application status config | 5 |
| AdminLawyers.jsx:22-41 | User + app status config | 5+3 |
| AdminNetworkReview.jsx:20-31 | Network review status config | 4 |

### Known inconsistencies

| Issue | Details |
|-------|---------|
| `'active'` vs `'approved'` | AdminLawyers:123 maps `'active'` to `'approved'` — treated as equivalent in some checks |
| Case `'published'` labeled `'Available'` | CASE_STATUSES in DesignTokens maps `published` → label `Available` |
| Status config duplicated 4x | AdminApplications, AdminLawyers, AdminNetworkReview, DesignTokens each define their own status color mappings |
| `profile_completed_at` is timestamp not boolean | But checked as truthy/falsy (`!user.profile_completed_at`) in 7+ files |
| `referral_agreement_accepted` on both User and LawyerProfile | Checked on user object in some places, profile in others |
