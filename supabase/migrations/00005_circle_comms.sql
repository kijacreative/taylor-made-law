-- 00005_circle_comms.sql
-- Circle messages, files, documents, versions, signatures, notifications

create type signature_status as enum ('pending', 'partially_signed', 'fully_signed', 'declined', 'not_required');
create type doc_signature_status as enum ('pending', 'signed', 'declined', 'expired');
create type document_status as enum ('draft', 'final');

-- ============================================================================
-- CIRCLE MESSAGES
-- ============================================================================

create table circle_messages (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  sender_user_id  uuid not null references profiles(id) on delete cascade,
  sender_email    text,
  body            text,
  has_attachments boolean default false,
  attachment_file_ids uuid[] default '{}',

  deleted_at      timestamptz,
  deleted_by      text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_circle_messages_circle on circle_messages(circle_id);

create trigger circle_messages_updated_at
  before update on circle_messages
  for each row execute function update_updated_at();

-- ============================================================================
-- CIRCLE FILES (chat attachments + shared library)
-- ============================================================================

create table circle_files (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  message_id      uuid references circle_messages(id) on delete set null,
  uploaded_by_user_id uuid references profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_by_email text,
  file_name       text,
  file_type       text,
  file_size       bigint,
  file_url        text not null,

  deleted_at      timestamptz,
  deleted_by      text,

  created_at      timestamptz default now()
);

create index idx_circle_files_circle on circle_files(circle_id);

-- ============================================================================
-- CIRCLE DOCUMENTS (versioned)
-- ============================================================================

create table circle_documents (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references legal_circles(id) on delete cascade,
  title           text not null,
  description     text,
  document_type   text,
  current_version_number integer default 1,
  current_file_url text,
  current_file_name text,
  uploaded_by_user_id uuid references profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_by_email text,
  case_id         uuid references cases(id) on delete set null,
  tags            text[] default '{}',
  is_confidential boolean default false,

  requires_signature boolean default false,
  signature_status signature_status default 'not_required',
  signature_requested_by text,
  signature_requested_at timestamptz,
  signature_deadline timestamptz,

  track_changes_enabled boolean default false,
  has_pending_changes boolean default false,
  status          document_status default 'draft',

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_circle_documents_circle on circle_documents(circle_id);

create trigger circle_documents_updated_at
  before update on circle_documents
  for each row execute function update_updated_at();

-- ============================================================================
-- DOCUMENT VERSIONS
-- ============================================================================

create table document_versions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references circle_documents(id) on delete cascade,
  version_number  integer not null,
  file_url        text not null,
  file_name       text,
  file_type       text,
  file_size       bigint,
  uploaded_by_user_id uuid references profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_by_email text,
  change_summary  text,
  has_tracked_changes boolean default false,
  tracked_changes_data jsonb,
  is_current      boolean default false,
  upload_reason   text default 'revision',

  created_at      timestamptz default now()
);

create index idx_document_versions_doc on document_versions(document_id);

-- ============================================================================
-- DOCUMENT SIGNATURES
-- ============================================================================

create table document_signatures (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references circle_documents(id) on delete cascade,
  signer_user_id  uuid references profiles(id) on delete set null,
  signer_email    text not null,
  signer_name     text,
  requested_by_user_id uuid references profiles(id) on delete set null,
  requested_by_name text,

  status          doc_signature_status default 'pending',
  signed_at       timestamptz,
  signature_ip    text,
  signature_method text,
  signature_data  text,
  expires_at      timestamptz,
  decline_reason  text,

  created_at      timestamptz default now()
);

create index idx_document_signatures_doc on document_signatures(document_id);

-- ============================================================================
-- CIRCLE NOTIFICATIONS
-- ============================================================================

create table circle_notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  user_email      text,
  circle_id       uuid references legal_circles(id) on delete set null,
  type            text, -- 'invite', 'new_message', 'case_update'
  title           text,
  body            text,
  link            text,
  is_read         boolean default false,
  reference_id    text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_circle_notifications_user on circle_notifications(user_id);

create trigger circle_notifications_updated_at
  before update on circle_notifications
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Circle Comms
-- ============================================================================

alter table circle_messages enable row level security;
alter table circle_files enable row level security;
alter table circle_documents enable row level security;
alter table document_versions enable row level security;
alter table document_signatures enable row level security;
alter table circle_notifications enable row level security;

-- Circle messages/files/documents: scoped to circle membership
create policy "Members can view circle messages"
  on circle_messages for select
  using (is_circle_member(circle_id, auth.uid()));
create policy "Members can send circle messages"
  on circle_messages for insert
  with check (is_circle_member(circle_id, auth.uid()));
create policy "Senders can update own messages"
  on circle_messages for update
  using (sender_user_id = auth.uid());
create policy "Admins can manage all circle messages"
  on circle_messages for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Members can view circle files"
  on circle_files for select
  using (is_circle_member(circle_id, auth.uid()));
create policy "Members can upload circle files"
  on circle_files for insert
  with check (is_circle_member(circle_id, auth.uid()));
create policy "Uploaders can update own files"
  on circle_files for update
  using (uploaded_by_user_id = auth.uid());

create policy "Members can view circle documents"
  on circle_documents for select
  using (is_circle_member(circle_id, auth.uid()));
create policy "Members can create circle documents"
  on circle_documents for insert
  with check (is_circle_member(circle_id, auth.uid()));
create policy "Members can update circle documents"
  on circle_documents for update
  using (is_circle_member(circle_id, auth.uid()));

create policy "Members can view document versions"
  on document_versions for select
  using (exists (
    select 1 from circle_documents cd
    where cd.id = document_versions.document_id
    and is_circle_member(cd.circle_id, auth.uid())
  ));
create policy "Members can create document versions"
  on document_versions for insert
  with check (exists (
    select 1 from circle_documents cd
    where cd.id = document_versions.document_id
    and is_circle_member(cd.circle_id, auth.uid())
  ));

create policy "Signers can view own signatures"
  on document_signatures for select
  using (signer_user_id = auth.uid());
create policy "Signers can update own signatures"
  on document_signatures for update
  using (signer_user_id = auth.uid());
create policy "Members can create signature requests"
  on document_signatures for insert
  with check (auth.uid() is not null);

-- Notifications: user sees own
create policy "Users see own notifications"
  on circle_notifications for select
  using (user_id = auth.uid());
create policy "Users can update own notifications"
  on circle_notifications for update
  using (user_id = auth.uid());
create policy "Auth users can create notifications"
  on circle_notifications for insert
  with check (auth.uid() is not null);

-- Enable Supabase Realtime for circle comms
alter publication supabase_realtime add table circle_messages;
alter publication supabase_realtime add table circle_notifications;
