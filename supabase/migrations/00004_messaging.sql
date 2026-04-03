-- 00004_messaging.sql
-- Direct messaging: threads, messages, files, participants

-- ============================================================================
-- DM THREADS
-- ============================================================================

create table direct_message_threads (
  id              uuid primary key default gen_random_uuid(),
  participant_user_ids uuid[] default '{}',
  participant_emails text[] default '{}',
  is_archived     boolean default false,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid references profiles(id) on delete set null,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger dm_threads_updated_at
  before update on direct_message_threads
  for each row execute function update_updated_at();

-- ============================================================================
-- DM PARTICIPANTS (junction: profiles ↔ threads)
-- ============================================================================

create table direct_message_participants (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references direct_message_threads(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  user_email      text,
  last_read_at    timestamptz,
  is_hidden       boolean default false,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  unique (thread_id, user_id)
);

create index idx_dm_participants_user on direct_message_participants(user_id);
create index idx_dm_participants_thread on direct_message_participants(thread_id);

create trigger dm_participants_updated_at
  before update on direct_message_participants
  for each row execute function update_updated_at();

-- ============================================================================
-- DM MESSAGES
-- ============================================================================

create table direct_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references direct_message_threads(id) on delete cascade,
  sender_user_id  uuid not null references profiles(id) on delete cascade,
  sender_email    text,
  body            text,
  has_attachments boolean default false,
  attachment_file_ids uuid[] default '{}',

  deleted_at      timestamptz, -- soft delete (was is_deleted boolean)
  deleted_by      text,

  created_at      timestamptz default now()
);

create index idx_dm_messages_thread on direct_messages(thread_id);

-- ============================================================================
-- DM FILES
-- ============================================================================

create table direct_message_files (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid references direct_messages(id) on delete set null,
  thread_id       uuid not null references direct_message_threads(id) on delete cascade,
  uploaded_by_user_id uuid references profiles(id) on delete set null,
  file_name       text,
  file_type       text,
  file_size       bigint,
  file_url        text not null,

  deleted_at      timestamptz,

  created_at      timestamptz default now()
);

create index idx_dm_files_thread on direct_message_files(thread_id);

-- ============================================================================
-- RLS POLICIES — Messaging
-- ============================================================================

alter table direct_message_threads enable row level security;
alter table direct_message_participants enable row level security;
alter table direct_messages enable row level security;
alter table direct_message_files enable row level security;

-- Helper: is user a participant in this thread?
create or replace function is_thread_participant(p_thread_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from direct_message_participants
    where thread_id = p_thread_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Threads: participants only (admins bypass)
create policy "Participants can view their threads"
  on direct_message_threads for select
  using (
    is_thread_participant(id, auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Auth users can create threads"
  on direct_message_threads for insert
  with check (auth.uid() is not null);

create policy "Participants can update their threads"
  on direct_message_threads for update
  using (is_thread_participant(id, auth.uid()));

-- Participants
create policy "Participants can view thread participants"
  on direct_message_participants for select
  using (is_thread_participant(thread_id, auth.uid()));

create policy "Auth users can insert participants"
  on direct_message_participants for insert
  with check (auth.uid() is not null);

create policy "Users can update own participant record"
  on direct_message_participants for update
  using (user_id = auth.uid());

-- Messages: scoped to thread participation
create policy "Participants can view thread messages"
  on direct_messages for select
  using (
    is_thread_participant(thread_id, auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Participants can send messages"
  on direct_messages for insert
  with check (is_thread_participant(thread_id, auth.uid()));

create policy "Senders can update own messages"
  on direct_messages for update
  using (sender_user_id = auth.uid());

-- Files: scoped to thread participation
create policy "Participants can view thread files"
  on direct_message_files for select
  using (is_thread_participant(thread_id, auth.uid()));

create policy "Participants can upload files"
  on direct_message_files for insert
  with check (is_thread_participant(thread_id, auth.uid()));

-- Enable Supabase Realtime for messaging tables
alter publication supabase_realtime add table direct_messages;
alter publication supabase_realtime add table direct_message_participants;
