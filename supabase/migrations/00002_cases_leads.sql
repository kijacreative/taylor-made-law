-- 00002_cases_leads.sql
-- Cases (marketplace) and Leads (client intake)

create type case_status as enum ('draft', 'published', 'accepted', 'in_progress', 'closed', 'withdrawn');
create type lead_status as enum ('new', 'junior_review', 'senior_review', 'approved', 'rejected', 'published', 'routed_cochran', 'closed');
create type urgency_level as enum ('low', 'medium', 'high', 'urgent');
create type sync_status as enum ('pending', 'sent', 'failed');

-- ============================================================================
-- LEADS
-- ============================================================================

create table leads (
  id              uuid primary key default gen_random_uuid(),
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  practice_area   text,
  state           text,
  description     text,
  urgency         urgency_level,
  estimated_value numeric(12,2),
  source          text default 'website',

  status          lead_status default 'new',
  internal_notes  text,
  junior_reviewer text,
  junior_recommendation text,
  senior_reviewer text,
  senior_recommendation text,

  -- Lead Docket sync
  lead_docket_id  text,
  sync_status     sync_status default 'pending',
  sync_error_message text,
  last_sync_attempt_at timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_leads_status on leads(status);

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ============================================================================
-- CASES
-- ============================================================================

create table cases (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  summary         text,
  description     text,
  state           text,
  practice_area   text,
  estimated_value numeric(12,2),
  key_facts       text,

  status          case_status default 'draft',
  is_trending     boolean default false,
  lead_id         uuid references leads(id) on delete set null,

  -- client info
  client_first_name text,
  client_last_name  text,
  client_email    text,
  client_phone    text,

  -- assignment
  submitted_by_user_id uuid references profiles(id) on delete set null,
  submitted_by_name text,
  published_at    timestamptz,
  published_by    text,
  accepted_by     uuid references lawyer_profiles(id) on delete set null,
  accepted_by_email text,
  accepted_at     timestamptz,

  lawyer_notes    text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_cases_status on cases(status);
create index idx_cases_practice_area on cases(practice_area);

create trigger cases_updated_at
  before update on cases
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Cases & Leads
-- ============================================================================

alter table leads enable row level security;
alter table cases enable row level security;

-- Leads: admin/associate only
create policy "Admins can manage leads"
  on leads for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Cases: published readable by approved lawyers, admin full access
create policy "Approved lawyers can view published cases"
  on cases for select
  using (
    status = 'published' and
    exists (select 1 from profiles where id = auth.uid() and user_status = 'approved')
  );

create policy "Users can view own accepted cases"
  on cases for select
  using (
    accepted_by_email = (select email from profiles where id = auth.uid())
  );

create policy "Users can update own accepted cases"
  on cases for update
  using (
    accepted_by_email = (select email from profiles where id = auth.uid())
  );

create policy "Admins can manage all cases"
  on cases for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
