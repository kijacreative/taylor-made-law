# Permissions Matrix

> Generated 2026-04-02. All permissions inferred from frontend role checks and backend auth guards.
> No centralized RBAC config exists — permissions are enforced per-page (frontend) and per-function (backend).

---

## Role Definitions

| Field | Values | Where Checked |
|-------|--------|---------------|
| `user.role` | `'admin'`, `'user'` | Primary gate for admin vs lawyer portal |
| `user.user_type` | `'admin'`, `'senior_associate'`, `'junior_associate'`, `null` | Admin tier within admin portal |
| `user.user_status` | `'invited'`, `'pending'`, `'approved'`, `'disabled'` | Lawyer lifecycle gate |
| `user.membership_status` | `'paid'`, `'trial'`, `'none'` | Paid feature gate (case acceptance) |
| `lawyerProfile.status` | `'pending'`, `'approved'`, `'restricted'` | Secondary approval check |

---

## Access Levels

| Level | Description | How Enforced |
|-------|-------------|-------------|
| **PUBLIC** | No authentication required | No auth check in page component |
| **AUTH** | Any authenticated user | `base44.auth.isAuthenticated()` in useEffect |
| **LAWYER** | Authenticated + role != admin | `user.role !== 'admin'` check, else redirect to AdminDashboard |
| **LAWYER_APPROVED** | Authenticated + approved status | `user.user_status === 'approved'` or `lawyerProfile.status === 'approved'` |
| **LAWYER_PAID** | Authenticated + paid membership | `user.membership_status === 'paid'` |
| **ADMIN** | Authenticated + admin role | `user.role === 'admin'` |
| **ADMIN_TIERED** | Admin + specific user_type | `user.user_type in ['admin', 'senior_associate', 'junior_associate']` |

---

## Route Permissions

### Public Pages

| Route | Access | Notes |
|-------|--------|-------|
| `/` (Home) | PUBLIC | Static marketing page |
| `/Blog` | PUBLIC | Published blog posts only |
| `/PublicBlogDetail` | PUBLIC | Single published post |
| `/FindLawyer` | PUBLIC | Lead intake form — creates Lead, ConsentLog |
| `/ForLawyers` | PUBLIC | Attorney signup form |
| `/JoinNetwork` | PUBLIC | Attorney signup variant |
| `/join-lawyer-network` | PUBLIC | Attorney signup with password |
| `/LawyerLogin` | PUBLIC | Blocks admins, blocks disabled users |
| `/login` | PUBLIC | Alternative lawyer login |
| `/AdminLogin` | PUBLIC | Redirects non-admins after OTP |
| `/Activate` | PUBLIC | Token-gated (requires `?token=`) |
| `/verify-email` | PUBLIC | Email-gated (requires `?email=`) |
| `/set-password` | PUBLIC | Token-gated (requires `?token=`) |
| `/ForgotPassword` | PUBLIC | Always shows success (prevents enumeration) |
| `/ResetPassword` | PUBLIC | Token-gated |
| `/terms` | PUBLIC | Static legal text |
| `/privacy` | PUBLIC | Static legal text |

### Lawyer Portal

| Route | Access | Status Gate | Membership Gate | Disabled Behavior |
|-------|--------|------------|-----------------|-------------------|
| `/LawyerDashboard` | LAWYER | Any status (shows banners for pending) | None | Forced logout |
| `/CaseExchange` | LAWYER_APPROVED | approved or active | Teaser mode if unpaid; upgrade modal | Redirect to login |
| `/CaseDetail` | LAWYER_APPROVED | approved | paid required to accept | Upgrade modal |
| `/MyCases` | AUTH | None | None | — |
| `/Groups` | AUTH | Blocks circle creation if pending/invited | None | — |
| `/GroupDetail` | AUTH | Must be active circle member | None | — |
| `/GroupInvitations` | AUTH | None | None | — |
| `/CreateGroup` | AUTH | Blocks if pending/invited/active_pending_review | None | — |
| `/app/messages` | LAWYER_APPROVED | approved (checked via LawyerProfile) | None | Shows "approval required" banner |
| `/app/messages/:threadId` | LAWYER_APPROVED | approved | None | Redirect to /app/messages |
| `/LawyerSettings` | AUTH | None (shows status warnings) | None | — |
| `/LawyerOnboarding` | LAWYER | Skips if profile_completed_at exists | None | Forced logout if disabled |
| `/LawyerBlog` | AUTH | None | None | — |
| `/LawyerBlogDetail` | AUTH | None | None | — |
| `/LawyerResources` | AUTH | approved_only resources hidden if not approved | None | — |
| `/LawyerResourceDetail` | AUTH | Locks approved_only resources | None | — |
| `/MassTorts` | AUTH | None | None | — |
| `/MassTortDetail` | AUTH | None | None | — |
| `/Content` | AUTH | None | None | — |
| `/ContentDetail` | AUTH | None | None | — |

### Admin Portal

| Route | Access | Tier Check | Notes |
|-------|--------|-----------|-------|
| `/AdminDashboard` | ADMIN_TIERED | admin, senior_associate, junior_associate | KPI overview |
| `/AdminLeads` | ADMIN_TIERED | admin, senior_associate, junior_associate | Lead queue |
| `/AdminLeadDetail` | ADMIN_TIERED | admin, senior_associate, junior_associate | Junior can recommend; senior/admin can approve/reject |
| `/AdminCases` | ADMIN_TIERED | admin, senior_associate, junior_associate | Case CRUD |
| `/AdminLawyers` | ADMIN | admin only | Attorney + application management |
| `/admin/applications` | ADMIN | admin only | Application review queue |
| `/AdminNetworkReview` | ADMIN | admin only | JoinNetwork approval queue |
| `/AdminTeam` | ADMIN | admin only | Admin user management |
| `/AdminBlog` | ADMIN | admin only | Blog CMS |
| `/AdminBlogEdit` | ADMIN | admin only | Blog editor |
| `/AdminResources` | ADMIN | admin only | Resource manager |
| `/AdminResourceEdit` | ADMIN | admin only | Resource editor |
| `/AdminPopups` | ADMIN | admin only | Pop-up manager |
| `/AdminPopupEdit` | ADMIN | admin only | Pop-up editor |
| `/AdminCircles` | ADMIN | admin only | Circle monitoring |
| `/admin/lead-docket-sync` | ADMIN_TIERED | admin, senior_associate, junior_associate | Lead Docket sync monitor |

---

## Entity CRUD Permissions

### Lawyer (role=user) Access

| Entity | Create | Read | Update | Delete | Conditions |
|--------|--------|------|--------|--------|------------|
| User | — | Own record only | Own profile fields | — | Via auth.updateMe |
| LawyerProfile | Own | Own (filter by user_id) | Own | — | Created during onboarding |
| Case | — | Published cases (via getCasesForLawyer) | Own accepted cases (notes, value) | — | Approved see full; pending see teaser |
| Lead | — | — | — | — | No lawyer access to leads |
| LegalCircle | Yes | Own memberships + discoverable | Own circles (if admin role in circle) | — (soft: is_active=false) | |
| LegalCircleMember | Yes (join via invite) | Own circle memberships | Own membership (leave) | — | Circle admin can remove others |
| LegalCircleCase | Yes (submit to circle) | Own circle cases | — | — | Requires approved LawyerProfile |
| DirectMessage | Yes (send) | Own threads | Own messages (soft delete) | — | Requires approved status |
| DirectMessageFile | Yes (upload) | Own thread files | — | — | Requires thread membership |
| CircleMessage | Yes (send) | Own circle messages | Own messages (soft delete) | — | Requires circle membership |
| CircleFile | Yes (upload) | Own circle files | — | Own or admin (soft delete) | Requires circle membership |
| CircleDocument | Yes (upload) | Own circle docs | — | — | Requires circle membership |
| BlogPost | — | Published only | — | — | |
| Resource | — | All published; approved_only if approved | — | — | ResourceEvent created on view/download |
| MassTort | — | Published only | — | — | |
| ContentPost | — | Published only | — | — | |
| Popup | — | Active popups (via PopupModal) | — | — | PopupImpression created on view |
| AuditLog | — | — | — | — | Write-only from frontend (create) |
| ConsentLog | Yes | — | — | — | Write-only |

### Admin (role=admin) Access

| Entity | Create | Read | Update | Delete | Notes |
|--------|--------|------|--------|--------|-------|
| User | Via inviteUser | All | All (status, fields) | Yes (AdminTeam) | Full control |
| LawyerProfile | Yes (during approval) | All | All | — | Synced with User on approval |
| LawyerApplication | — | All | All (status, reviewed_by) | — | Review workflow |
| Case | Yes (from lead) | All | All (status, trending) | — (withdraw) | |
| Lead | — | All | All (status, notes, reviewer) | — | Tiered review workflow |
| LegalCircle | — | All | is_active toggle | — | Monitoring only |
| BlogPost | Yes | All | All | Yes | Full CMS |
| Resource | Yes | All | All | Yes | Full CMS |
| Popup | Yes | All | All | Yes | Full CMS |
| AuditLog | — | All (filter by entity) | — | — | Read-only for admin |

---

## Backend Function Permissions

### Public (no auth required)

| Function | Purpose |
|----------|---------|
| publicLawyerSignup | Self-registration with password |
| submitLawyerApplication | Application without account creation |
| applyToNetwork | Application (admin alerted) |
| joinLawyerNetwork | Self-registration with OTP |
| activateAccount | Token-based account activation |
| activateAttorney | Invitation-based activation |
| activateFromApplication | Application-based activation |
| registerActivation | Token validation + auth.register |
| finalizeActivation | Post-OTP status finalization |
| resolveVerifyEmail | Token → email lookup |
| sendEmailOtp | OTP generation (rate-limited: 5/hr) |
| verifyEmailOtp | OTP validation (max 5 attempts) |
| sendApplicationEmails | Generic email sending |
| sendVerificationEmail | Verification link email |
| joinNetwork | Delegates to applyToNetwork |
| stripeWebhook | Stripe signature-verified |
| emailTemplates | Shared HTML helpers |
| notifyAdminNewLawyer | Internal system notification |

### User-authenticated (any approved lawyer)

| Function | Additional Checks |
|----------|-------------------|
| getCasesForLawyer | Returns teaser for pending, full for approved |
| acceptCase | Requires `user_status=approved` + `membership_status=paid` |
| submitCase | Requires approved LawyerProfile; if circle: active membership |
| startDirectThread | Both parties must have approved LawyerProfile |
| getDirectInbox | — |
| getDirectThread | Must be thread participant (admin bypasses) |
| sendDirectMessage | Requires approved LawyerProfile + thread participant |
| uploadDirectMessageFile | Must be thread participant |
| searchNetworkAttorneys | Returns only approved attorneys |
| createCircleInvitation | Must be active circle member |
| acceptCircleInvite | — |
| sendCircleInviteEmail | — |
| notifyCircleMessage | — |
| uploadCircleFile | Must be active circle member |
| deleteCircleFile | Must be uploader or circle admin |
| uploadCircleDocument | — |
| createDocumentVersion | — |
| getDocumentHistory | — |
| requestDocumentSignatures | — |
| signDocument | Must be designated signer |
| trackDocumentChanges | — |
| createSubscriptionCheckout | — |
| createSetupIntent | — |

### Admin-only (role=admin required)

| Function | Purpose |
|----------|---------|
| approveLawyer | Set user_status=approved, send email |
| approveLawyerApplication | Approve application + create profile |
| reviewLawyerApplication | Approve/disable/request info |
| rejectLawyerApplication | Reject application |
| rejectLawyer | Disable + restrict profile |
| disableLawyer | Set user_status=disabled |
| reinstateLawyer | Reverse disable |
| requestMoreInfo | Request info from applicant |
| inviteAttorney | Create user + send activation |
| inviteAdminUser | Create admin user |
| generateLegacyReport | Export all lawyer data |
| resendActivation | Re-send activation (admin path requires role check) |
| sendApprovalEmail | Send branded approval email |

---

## Lead Review Tier Permissions

The lead review workflow has a three-tier permission model within the admin portal:

| Action | Junior Associate | Senior Associate | Admin |
|--------|-----------------|-----------------|-------|
| View lead queue | Yes | Yes | Yes |
| Start review (→ junior_review) | Yes | Yes | Yes |
| Recommend approve (→ senior_review) | Yes | — | — |
| Recommend reject (→ senior_review) | Yes | — | — |
| Approve lead (→ approved) | — | Yes | Yes |
| Publish to marketplace (→ Case) | — | Yes | Yes |
| Route to Cochran Firm | — | Yes | Yes |
| Reject lead | — | Yes | Yes |
| Edit internal notes | Yes | Yes | Yes |
| Edit estimated value | Yes | Yes | Yes |

---

## Security Enforcement Summary

| Layer | Method | Coverage |
|-------|--------|----------|
| **Frontend route guards** | Per-page `useEffect` with `isAuthenticated()` + role checks | All authenticated pages |
| **Frontend UI gates** | Conditional rendering based on `user_status`, `membership_status` | Case acceptance, circle creation, messaging |
| **Backend auth guards** | `base44.auth.me()` + `role !== 'admin'` check | 39 of 56 functions |
| **Backend RLS** | `base44.entities.*` (user-scoped) vs `base44.asServiceRole.entities.*` | All entity access |
| **Token validation** | SHA-256 hash comparison + expiry check + single-use mark | Activation, OTP, invitation flows |
| **Rate limiting** | Email OTP: 5 requests/hr/email; OTP verification: 5 attempts max | sendEmailOtp, verifyEmailOtp |

### What's NOT enforced

| Gap | Detail |
|-----|--------|
| No route-level middleware | Each page implements its own auth check; missing a check = open page |
| No centralized RBAC | Role/status checks are string comparisons scattered across 50+ files |
| No schema validation | Any field can be written to any entity — no type checking |
| File URLs are public | Uploaded files have no auth gate — URL knowledge = access |
| Admin can read all DMs | `getDirectThread` allows admin bypass of participant check |
| Circle membership not re-checked on every operation | Membership verified on entry but could be revoked mid-session |
