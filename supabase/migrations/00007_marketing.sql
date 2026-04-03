-- 00007_marketing.sql
-- Popups and popup impressions

create type popup_status as enum ('draft', 'active', 'inactive');

-- ============================================================================
-- POPUPS
-- ============================================================================

create table popups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  status          popup_status default 'draft',
  size            text, -- 'small', 'medium', 'large'

  placement       text, -- 'dashboard', 'home', 'case_exchange', 'all_app'
  audience        text, -- 'all', 'pending', 'approved'
  trigger_type    text, -- 'on_load', 'delay', 'scroll'
  delay_seconds   integer default 0,
  scroll_percent  integer default 0,
  frequency       text, -- 'once_ever', 'once_per_day', 'once_per_session', 'every_visit'

  start_at        timestamptz,
  end_at          timestamptz,

  headline        text,
  body_text       text,
  image_url       text,
  image_alt       text,
  image_clickable boolean default false,
  link_url        text,
  link_new_tab    boolean default false,
  button_label    text,
  close_on_overlay boolean default true,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger popups_updated_at
  before update on popups
  for each row execute function update_updated_at();

-- ============================================================================
-- POPUP IMPRESSIONS
-- ============================================================================

create table popup_impressions (
  id              uuid primary key default gen_random_uuid(),
  popup_id        uuid not null references popups(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  user_email      text,
  dismissed_at    timestamptz,
  clicked_at      timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_popup_impressions_popup on popup_impressions(popup_id);
create index idx_popup_impressions_user on popup_impressions(user_id);

create trigger popup_impressions_updated_at
  before update on popup_impressions
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Marketing
-- ============================================================================

alter table popups enable row level security;
alter table popup_impressions enable row level security;

create policy "Auth users can view active popups"
  on popups for select
  using (status = 'active' and auth.uid() is not null);
create policy "Admins can manage all popups"
  on popups for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Users can view own impressions"
  on popup_impressions for select
  using (user_id = auth.uid());
create policy "Users can create impressions"
  on popup_impressions for insert
  with check (auth.uid() is not null);
create policy "Users can update own impressions"
  on popup_impressions for update
  using (user_id = auth.uid());
create policy "Admins can view all impressions"
  on popup_impressions for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
