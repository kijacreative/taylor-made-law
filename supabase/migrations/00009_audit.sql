-- 00009_audit.sql
-- Audit logs, consent logs, generic invitations

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null,
  entity_id       text,
  action          text not null,
  actor_id        uuid references profiles(id) on delete set null, -- proper FK (was email-only in Base44)
  actor_email     text, -- kept for display/search
  actor_role      text,
  notes           text,
  before_state    jsonb,
  after_state     jsonb,

  created_at      timestamptz default now()
);

create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_actor on audit_logs(actor_id);
create index idx_audit_logs_created on audit_logs(created_at desc);

-- ============================================================================
-- CONSENT LOGS
-- ============================================================================

create table consent_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null,
  consent_type    text not null, -- 'terms', 'referral_agreement', 'data_processing'
  consent_version text,
  consent_text    text,
  accepted        boolean default true,
  ip_address      text,
  user_agent      text,
  consented_at    timestamptz default now(),

  created_at      timestamptz default now()
);

create index idx_consent_logs_user on consent_logs(user_id);

-- ============================================================================
-- INVITATIONS (generic — used in FindLawyer attorney referral)
-- ============================================================================

create table invitations (
  id              uuid primary key default gen_random_uuid(),
  invitee_email   text,
  inviter_user_id uuid references profiles(id) on delete set null,
  inviter_email   text,
  message         text,
  accepted_at     timestamptz,

  created_at      timestamptz default now()
);

-- ============================================================================
-- RLS POLICIES — Audit
-- ============================================================================

alter table audit_logs enable row level security;
alter table consent_logs enable row level security;
alter table invitations enable row level security;

-- Audit logs: insert-only for auth users, admin read
create policy "Auth users can insert audit logs"
  on audit_logs for insert
  with check (auth.uid() is not null);
create policy "Admins can view audit logs"
  on audit_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Consent logs: insert-only for auth users, admin read
create policy "Auth users can insert consent logs"
  on consent_logs for insert
  with check (auth.uid() is not null);
create policy "Admins can view consent logs"
  on consent_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Invitations: auth users can create
create policy "Auth users can create invitations"
  on invitations for insert
  with check (auth.uid() is not null);
create policy "Admins can view invitations"
  on invitations for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- STORAGE BUCKETS (defined as SQL for documentation; also create via Supabase dashboard)
-- ============================================================================

-- Avatars: public read, auth write
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Documents: auth read/write, scoped by membership
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- Content: public read, admin write (blog images, resource files, popup images)
insert into storage.buckets (id, name, public) values ('content', 'content', true)
  on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Auth users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Auth users can view documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid() is not null);

create policy "Auth users can upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid() is not null);

create policy "Anyone can view content"
  on storage.objects for select
  using (bucket_id = 'content');

create policy "Admins can upload content"
  on storage.objects for insert
  with check (
    bucket_id = 'content'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
