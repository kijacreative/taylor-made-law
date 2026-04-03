-- 00001_core_identity.sql
-- Profiles (linked to Supabase auth.users), lawyer applications
-- Supabase Auth handles email, password, JWT — profiles stores app-specific fields.

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('admin', 'user');
create type user_type_enum as enum ('admin', 'senior_associate', 'junior_associate');
create type user_status as enum ('invited', 'pending', 'approved', 'disabled');
create type membership_status as enum ('paid', 'trial', 'none');
create type subscription_status as enum ('active', 'trial', 'past_due', 'cancelled', 'none');
create type lawyer_profile_status as enum ('pending', 'approved', 'restricted');
create type application_status as enum (
  'pending', 'approved', 'approved_pending_activation', 'active',
  'active_pending_review', 'rejected', 'disabled'
);

-- ============================================================================
-- PROFILES  (1:1 with auth.users)
-- ============================================================================

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text,
  phone           text,
  role            user_role not null default 'user',
  user_type       user_type_enum,
  user_status     user_status not null default 'invited',
  membership_status membership_status default 'none',
  subscription_status subscription_status default 'none',

  -- professional
  firm_name       text,
  bar_number      text,
  bio             text,
  website         text,
  office_address  text,
  profile_photo_url text,
  states_licensed text[] default '{}',
  practice_areas  text[] default '{}',
  years_experience integer,

  -- subscription / billing
  stripe_customer_id text,
  free_trial_months integer default 0,
  trial_ends_at   timestamptz,

  -- lifecycle timestamps
  email_verified    boolean default false,
  password_set      boolean default false,
  profile_completed_at timestamptz,
  account_activated_at timestamptz,
  approved_at       timestamptz,
  approved_by       text, -- admin email
  disabled_at       timestamptz,
  disabled_by       text,
  disabled_reason   text,
  reinstated_at     timestamptz,
  reinstated_by     text,
  invited_at        timestamptz,
  invited_by_admin  text,
  more_info_requested_at timestamptz,
  more_info_requested_by text,
  admin_note        text,
  review_status     text, -- 'rejected' or null

  -- referral agreement
  referral_agreement_accepted boolean default false,
  referral_agreement_accepted_at timestamptz,
  referral_agreement_version text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ============================================================================
-- LAWYER PROFILES  (1:1 with profiles, extended professional data)
-- ============================================================================

create table lawyer_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references profiles(id) on delete cascade,
  full_name       text,
  email           text,
  firm_name       text,
  phone           text,
  bar_number      text,
  bar_numbers     jsonb default '{}',
  bio             text,
  website         text,
  office_address  text,
  profile_photo_url text,
  states_licensed text[] default '{}',
  practice_areas  text[] default '{}',
  years_experience integer,

  status          lawyer_profile_status default 'pending',
  approved_at     timestamptz,
  approved_by     text,

  referral_agreement_accepted boolean default false,
  referral_agreement_accepted_at timestamptz,
  referral_agreement_version text,
  profile_completed boolean default false,

  subscription_status subscription_status default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  free_trial_months integer default 0,
  trial_ends_at   timestamptz,

  created_by      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger lawyer_profiles_updated_at
  before update on lawyer_profiles
  for each row execute function update_updated_at();

-- ============================================================================
-- LAWYER APPLICATIONS
-- ============================================================================

create table lawyer_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null, -- proper FK (was email-only in Base44)
  full_name       text not null,
  email           text not null,
  phone           text,
  firm_name       text,
  bar_number      text,
  bar_numbers     jsonb default '{}',
  years_experience integer,
  states_licensed text[] default '{}',
  practice_areas  text[] default '{}',
  bio             text,
  referrals       jsonb default '[]', -- [{name, email}]

  status          application_status default 'pending',
  email_verified  boolean default false,
  user_created    boolean default false,
  consent_terms   boolean default false,
  consent_referral boolean default false,

  signup_source   text, -- 'circle_invite', 'public_form'
  circle_token    text,
  circle_id       uuid, -- FK added in 00003_circles.sql

  activation_token_hash text,
  activation_token_expires_at timestamptz,
  activation_token_used boolean default false,

  rejection_reason text,
  reviewed_at     timestamptz,
  reviewed_by     text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_lawyer_applications_email on lawyer_applications(email);
create index idx_lawyer_applications_status on lawyer_applications(status);

create trigger lawyer_applications_updated_at
  before update on lawyer_applications
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Core Identity
-- ============================================================================

alter table profiles enable row level security;
alter table lawyer_profiles enable row level security;
alter table lawyer_applications enable row level security;

-- Profiles: users see own, admins see all
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all profiles"
  on profiles for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Lawyer profiles: same pattern
create policy "Users can view own lawyer profile"
  on lawyer_profiles for select
  using (user_id = auth.uid());

create policy "Users can update own lawyer profile"
  on lawyer_profiles for update
  using (user_id = auth.uid());

create policy "Users can insert own lawyer profile"
  on lawyer_profiles for insert
  with check (user_id = auth.uid());

create policy "Admins can manage all lawyer profiles"
  on lawyer_profiles for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Applications: admins manage, users see own by email
create policy "Users can view own applications"
  on lawyer_applications for select
  using (
    email = (select email from profiles where id = auth.uid())
  );

create policy "Admins can manage all applications"
  on lawyer_applications for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
