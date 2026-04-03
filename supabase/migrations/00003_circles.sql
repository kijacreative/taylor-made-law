-- 00003_circles.sql
-- Legal circles, membership, invitations, circle cases

create type circle_visibility as enum ('hidden', 'discoverable');
create type circle_member_role as enum ('admin', 'moderator', 'member');
create type circle_member_status as enum ('active', 'pending', 'removed', 'declined');
create type circle_invite_status as enum ('pending', 'accepted', 'declined', 'expired');
create type circle_case_status as enum ('pending_approval', 'available', 'accepted', 'closed');

-- ============================================================================
-- LEGAL CIRCLES
-- ============================================================================

create table legal_circles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique,
  description     text,
  group_type      text, -- 'private', 'firm_based', 'peer_based', 'practice_group', etc.
  visibility      circle_visibility default 'hidden',
  tags            text[] default '{}',
  member_count    integer default 0,
  is_active       boolean default true,

  case_sharing_enabled boolean default false,
  require_admin_approval boolean default false,
  member_can_submit_cases boolean default false,
  member_can_accept_cases boolean default false,

  created_by_user_id uuid references profiles(id) on delete set null,
  created_by_email text,
  created_by_name text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger legal_circles_updated_at
  before update on legal_circles
  for each row execute function update_updated_at();

-- Add deferred FK from lawyer_applications.circle_id
alter table lawyer_applications
  add constraint fk_lawyer_applications_circle
  foreign key (circle_id) references legal_circles(id) on delete set null;

-- ============================================================================
-- CIRCLE MEMBERS (junction: profiles ↔ circles)
-- ============================================================================

create table legal_circle_members (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  user_email      text,
  user_name       text,
  full_name       text,
  profile_photo_url text,

  role            circle_member_role default 'member',
  status          circle_member_status default 'active',
  joined_at       timestamptz default now(),
  invited_by      uuid references profiles(id) on delete set null,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  unique (circle_id, user_id)
);

create index idx_circle_members_circle on legal_circle_members(circle_id);
create index idx_circle_members_user on legal_circle_members(user_id);

create trigger legal_circle_members_updated_at
  before update on legal_circle_members
  for each row execute function update_updated_at();

-- ============================================================================
-- CIRCLE INVITATIONS
-- ============================================================================

create table legal_circle_invitations (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  inviter_user_id uuid references profiles(id) on delete set null,
  inviter_name    text,
  invitee_email   text not null,
  invitee_name    text,
  invitee_user_id uuid references profiles(id) on delete set null,
  token           text,
  message         text,

  status          circle_invite_status default 'pending',
  sent_at         timestamptz default now(),
  accepted_at     timestamptz,
  expires_at      timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_circle_invitations_invitee on legal_circle_invitations(invitee_email);

create trigger legal_circle_invitations_updated_at
  before update on legal_circle_invitations
  for each row execute function update_updated_at();

-- ============================================================================
-- CIRCLE CASES (cases shared within a circle)
-- ============================================================================

create table legal_circle_cases (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  title           text not null,
  summary         text,
  description     text,
  state           text,
  practice_area   text,
  estimated_value numeric(12,2),
  key_facts       text,

  client_first_name text,
  client_last_name  text,
  client_email    text,
  client_phone    text,

  submitted_by_user_id uuid references profiles(id) on delete set null,
  submitted_by_name text,
  submitted_by_email text,

  status          circle_case_status default 'pending_approval',
  accepted_by_user_id uuid references profiles(id) on delete set null,
  accepted_by_email text,
  accepted_by_name text,
  accepted_at     timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_circle_cases_circle on legal_circle_cases(circle_id);

create trigger legal_circle_cases_updated_at
  before update on legal_circle_cases
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Circles
-- ============================================================================

alter table legal_circles enable row level security;
alter table legal_circle_members enable row level security;
alter table legal_circle_invitations enable row level security;
alter table legal_circle_cases enable row level security;

-- Helper: is user an active member of a circle?
create or replace function is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from legal_circle_members
    where circle_id = p_circle_id and user_id = p_user_id and status = 'active'
  );
$$ language sql security definer stable;

-- Circles: members see their circles, discoverable visible to all auth users
create policy "Members can view their circles"
  on legal_circles for select
  using (
    is_circle_member(id, auth.uid()) or
    (visibility = 'discoverable' and is_active = true)
  );

create policy "Admins can manage all circles"
  on legal_circles for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Auth users can create circles"
  on legal_circles for insert
  with check (auth.uid() is not null);

create policy "Circle admins can update their circles"
  on legal_circles for update
  using (
    exists (
      select 1 from legal_circle_members
      where circle_id = legal_circles.id and user_id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

-- Members: scoped to circle membership
create policy "Members can view circle members"
  on legal_circle_members for select
  using (is_circle_member(circle_id, auth.uid()));

create policy "Admins can manage all members"
  on legal_circle_members for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Auth users can insert members"
  on legal_circle_members for insert
  with check (auth.uid() is not null);

create policy "Circle admins can update members"
  on legal_circle_members for update
  using (
    exists (
      select 1 from legal_circle_members cm
      where cm.circle_id = legal_circle_members.circle_id
        and cm.user_id = auth.uid() and cm.role = 'admin' and cm.status = 'active'
    )
  );

-- Invitations: invitee or circle member can see
create policy "Users can view own invitations"
  on legal_circle_invitations for select
  using (
    invitee_email = (select email from profiles where id = auth.uid())
    or is_circle_member(circle_id, auth.uid())
  );

create policy "Circle members can create invitations"
  on legal_circle_invitations for insert
  with check (is_circle_member(circle_id, auth.uid()));

create policy "Users can update own invitations"
  on legal_circle_invitations for update
  using (
    invitee_email = (select email from profiles where id = auth.uid())
    or is_circle_member(circle_id, auth.uid())
  );

create policy "Admins can manage all invitations"
  on legal_circle_invitations for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Circle cases: scoped to circle membership
create policy "Members can view circle cases"
  on legal_circle_cases for select
  using (is_circle_member(circle_id, auth.uid()));

create policy "Members can insert circle cases"
  on legal_circle_cases for insert
  with check (is_circle_member(circle_id, auth.uid()));

create policy "Admins can manage all circle cases"
  on legal_circle_cases for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
