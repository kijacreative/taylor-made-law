# Supabase Foundation

> Created 2026-04-02. Schema derived from reverse-engineered Base44 entity model (see domain-model.md).

## Overview

This sets up the Supabase database schema, storage buckets, and RLS policies for the Taylor Made Law platform. The app is **not yet connected** to Supabase — the service layer still uses the Base44 mock client. This is the foundation layer only.

## Architecture Decisions

### Auth: Supabase Auth + profiles table
- `auth.users` (managed by Supabase) handles email, password, JWT tokens
- `profiles` table stores app-specific fields (role, status, firm, etc.)
- A database trigger auto-creates a `profiles` row when a user signs up
- `profiles.id` = `auth.users.id` (1:1, UUID)

### Schema improvements over Base44
| Base44 Pattern | Supabase Pattern |
|---------------|-----------------|
| No FKs (email-string matching) | Proper UUID FKs with ON DELETE cascade/set null |
| `created_date` / `updated_date` | `created_at` / `updated_at` (standardized) |
| `is_deleted` boolean | `deleted_at` timestamptz (soft delete with timestamp) |
| No constraints | PostgreSQL enums for all status fields |
| JSON arrays in strings | Native `text[]` arrays for states, practice areas, tags |
| No indexes | Indexes on FKs, status fields, slugs |

### Storage buckets
| Bucket | Access | Contents |
|--------|--------|----------|
| `avatars` | Public read, auth write | Profile photos |
| `documents` | Auth read/write | Circle documents, DM files |
| `content` | Public read, admin write | Blog images, resource files, popup images |

## Tables (27 tables across 9 migrations)

### 00001 — Core Identity
- `profiles` — app user data (1:1 with auth.users)
- `lawyer_profiles` — extended attorney professional data
- `lawyer_applications` — registration pipeline

### 00002 — Cases & Leads
- `leads` — inbound client intake
- `cases` — case marketplace listings

### 00003 — Circles
- `legal_circles` — collaboration groups
- `legal_circle_members` — membership junction
- `legal_circle_invitations` — invite records
- `legal_circle_cases` — cases shared within circles

### 00004 — Messaging
- `direct_message_threads` — DM conversations
- `direct_message_participants` — thread membership + read tracking
- `direct_messages` — individual messages
- `direct_message_files` — file attachments

### 00005 — Circle Communications
- `circle_messages` — group chat messages
- `circle_files` — shared files
- `circle_documents` — versioned documents
- `document_versions` — revision history
- `document_signatures` — e-signature tracking
- `circle_notifications` — in-app notifications

### 00006 — Content
- `blog_posts` — articles and white papers
- `content_posts` — platform updates / legal news
- `resources` — downloadable resources
- `resource_events` — download/view tracking
- `mass_torts` — mass tort listings

### 00007 — Marketing
- `popups` — in-app announcements
- `popup_impressions` — view/click/dismiss tracking

### 00008 — Auth Tokens
- `activation_tokens` — account activation (SHA-256 hashed)
- `email_verification_otps` — email OTP codes
- `attorney_invitations` — admin-issued invites

### 00009 — Audit & Compliance
- `audit_logs` — system audit trail
- `consent_logs` — user consent records
- `invitations` — generic invitations

## Realtime

Four tables are added to the Supabase Realtime publication:
- `direct_messages` — DM real-time updates
- `direct_message_participants` — read receipt propagation
- `circle_messages` — circle chat real-time
- `circle_notifications` — notification badge updates

## RLS Policy Summary

| Table Group | Read | Write | Admin |
|-------------|------|-------|-------|
| profiles | Own row | Own row | All rows |
| lawyer_profiles | Own row | Own row | All rows |
| cases | Published (if approved) + own accepted | Own accepted | All |
| leads | — | — | All |
| circles | Member circles + discoverable | Circle admins | All |
| circle_members | Same circle | Circle admins | All |
| DM threads/messages | Participants only | Participants | All (admin bypass) |
| blog/content/mass_torts | Published = public | — | All |
| resources | Published (auth required) | — | All |
| auth tokens | — | — | Service role only |
| audit/consent logs | — (insert-only) | Insert only | Read all |

## Local Setup

### Prerequisites
- Docker Desktop running (required for local Supabase)
- Node.js 18+ / npm

### First-time setup
```bash
# 1. Start local Supabase (Docker must be running)
npx supabase start

# 2. Note the output — it shows:
#    API URL:   http://127.0.0.1:54321
#    anon key:  eyJ...
#    service_role key: eyJ...
#    Studio URL: http://127.0.0.1:54323

# 3. Copy the anon key to your .env:
#    VITE_SUPABASE_URL=http://127.0.0.1:54321
#    VITE_SUPABASE_ANON_KEY=<anon-key-from-above>

# 4. Apply migrations
npx supabase db reset

# 5. Open Supabase Studio to verify
open http://127.0.0.1:54323
```

### Daily workflow
```bash
# Start Supabase (if not running)
npx supabase start

# Apply new migrations after pulling changes
npx supabase db reset

# Stop Supabase
npx supabase stop
```

### Creating new migrations
```bash
npx supabase migration new <name>
# Edit the generated file in supabase/migrations/
# Then: npx supabase db reset
```

## Environment Variables

| Variable | Local Default | Description |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` | Supabase API endpoint |
| `VITE_SUPABASE_ANON_KEY` | (from `supabase start` output) | Public anon key for client-side access |

## What's NOT connected yet

- **Service layer** (`src/services/*`) still calls Base44 SDK via mock client
- **Auth** still uses Base44 auth (AuthContext.jsx)
- **File uploads** still use Base44 Core.UploadFile
- **Real-time** still uses Base44 subscriptions

The next step (not this task) is to wire the service layer to Supabase client instead of Base44.

## File Inventory

```
supabase/
  config.toml                          # Supabase CLI config (auto-generated)
  migrations/
    00001_core_identity.sql            # profiles, lawyer_profiles, lawyer_applications
    00002_cases_leads.sql              # cases, leads
    00003_circles.sql                  # legal_circles, members, invitations, circle_cases
    00004_messaging.sql                # dm_threads, dm_messages, dm_files, dm_participants
    00005_circle_comms.sql             # circle_messages, circle_files, documents, versions, signatures, notifications
    00006_content.sql                  # blog_posts, content_posts, resources, resource_events, mass_torts
    00007_marketing.sql                # popups, popup_impressions
    00008_auth_tokens.sql              # activation_tokens, email_otps, attorney_invitations
    00009_audit.sql                    # audit_logs, consent_logs, invitations + storage buckets
```
