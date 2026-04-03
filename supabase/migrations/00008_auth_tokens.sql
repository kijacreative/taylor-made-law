-- 00008_auth_tokens.sql
-- Activation tokens, email OTPs, attorney invitations

create type invitation_status as enum ('sent', 'accepted', 'expired');

-- ============================================================================
-- ACTIVATION TOKENS
-- ============================================================================

create table activation_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null,
  user_email      text not null,
  token_hash      text not null, -- SHA-256 hash
  token_type      text default 'activation',
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_by_admin text,

  created_at      timestamptz default now()
);

create index idx_activation_tokens_hash on activation_tokens(token_hash);
create index idx_activation_tokens_email on activation_tokens(user_email);

-- ============================================================================
-- EMAIL VERIFICATION OTPs
-- ============================================================================

create table email_verification_otps (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  code_hash       text not null, -- SHA-256 hash
  expires_at      timestamptz not null,
  used_at         timestamptz,
  attempts_count  integer default 0,

  created_at      timestamptz default now()
);

create index idx_email_otps_email on email_verification_otps(email);

-- ============================================================================
-- ATTORNEY INVITATIONS (admin-issued)
-- ============================================================================

create table attorney_invitations (
  id              uuid primary key default gen_random_uuid(),
  inviter_admin_user_id uuid references profiles(id) on delete set null,
  inviter_name    text,
  invitee_email   text not null,
  invitee_name    text,
  token_hash      text,
  firm_name       text,
  states_served   text[] default '{}',
  practice_areas  text[] default '{}',
  invitation_type text, -- 'approval_activation'

  status          invitation_status default 'sent',
  expires_at      timestamptz,
  used_at         timestamptz,

  created_at      timestamptz default now()
);

create index idx_attorney_invitations_email on attorney_invitations(invitee_email);
create index idx_attorney_invitations_hash on attorney_invitations(token_hash);

-- ============================================================================
-- RLS POLICIES — Auth Tokens
-- These tables are primarily accessed by backend/service role.
-- Minimal RLS for safety.
-- ============================================================================

alter table activation_tokens enable row level security;
alter table email_verification_otps enable row level security;
alter table attorney_invitations enable row level security;

-- Tokens: no direct client access (service role only)
-- But allow public insert for signup flows (via anon key with function)
create policy "Service role only for activation tokens"
  on activation_tokens for all
  using (false); -- blocked; use service_role key in backend

create policy "Service role only for OTPs"
  on email_verification_otps for all
  using (false); -- blocked; use service_role key in backend

create policy "Service role only for attorney invitations"
  on attorney_invitations for all
  using (false); -- blocked; use service_role key in backend
