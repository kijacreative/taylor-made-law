-- 00006_content.sql
-- Blog posts, content posts, resources, resource events, mass torts

create type content_status as enum ('draft', 'published');

-- ============================================================================
-- BLOG POSTS
-- ============================================================================

create table blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique,
  excerpt         text,
  body            text, -- HTML
  category        text,
  tags            text[] default '{}',
  author_name     text,
  author_email    text,

  featured_image_url text,
  featured_image_alt text,
  og_image_url    text,
  meta_title      text,
  meta_description text,
  canonical_url   text,
  pdf_download_url text,
  pdf_file_name   text,

  status          content_status default 'draft',
  is_pinned       boolean default false,
  feature_on_dashboard boolean default false,
  post_to_community boolean default false,
  published_at    timestamptz,
  read_time_minutes integer,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_blog_posts_slug on blog_posts(slug);
create index idx_blog_posts_status on blog_posts(status);

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function update_updated_at();

-- ============================================================================
-- CONTENT POSTS (platform updates, legal news)
-- ============================================================================

create table content_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique,
  excerpt         text,
  content         text, -- HTML (note: field named 'content' not 'body')
  category        text,
  tags            text[] default '{}',
  author_name     text,
  featured_image_url text,
  is_pinned       boolean default false,
  is_published    boolean default false,
  published_at    timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_content_posts_slug on content_posts(slug);

create trigger content_posts_updated_at
  before update on content_posts
  for each row execute function update_updated_at();

-- ============================================================================
-- RESOURCES
-- ============================================================================

create table resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique,
  description     text,
  resource_type   text, -- 'upload', 'external_link'
  file_url        text,
  file_name       text,
  file_type       text,
  file_size       bigint,
  external_url    text,
  external_new_tab boolean default false,
  thumbnail_url   text,
  category        text,
  tags            text[] default '{}',
  pdf_download_url text,
  pdf_file_name   text,
  is_featured     boolean default false,
  visibility      text default 'all_lawyers', -- 'approved_only', 'all_lawyers'

  status          content_status default 'draft',
  published_at    timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_resources_slug on resources(slug);
create index idx_resources_status on resources(status);

create trigger resources_updated_at
  before update on resources
  for each row execute function update_updated_at();

-- ============================================================================
-- RESOURCE EVENTS (download/view tracking)
-- ============================================================================

create table resource_events (
  id              uuid primary key default gen_random_uuid(),
  resource_id     uuid not null references resources(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  user_email      text,
  action_type     text, -- 'view', 'download'

  created_at      timestamptz default now()
);

create index idx_resource_events_resource on resource_events(resource_id);

-- ============================================================================
-- MASS TORTS
-- ============================================================================

create table mass_torts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique,
  status          text, -- 'Open', 'Monitoring', 'Closed'
  jurisdiction    text,
  short_summary   text,
  overview        text,
  ideal_cases     text,
  key_details     text[] default '{}',
  important_dates jsonb default '[]', -- [{date, description}]
  external_links  jsonb default '[]', -- [{url, label}]
  tags            text[] default '{}',
  is_featured     boolean default false,
  is_published    boolean default false,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_mass_torts_slug on mass_torts(slug);

create trigger mass_torts_updated_at
  before update on mass_torts
  for each row execute function update_updated_at();

-- ============================================================================
-- RLS POLICIES — Content
-- ============================================================================

alter table blog_posts enable row level security;
alter table content_posts enable row level security;
alter table resources enable row level security;
alter table resource_events enable row level security;
alter table mass_torts enable row level security;

-- Published content: publicly readable
create policy "Anyone can view published blog posts"
  on blog_posts for select
  using (status = 'published');
create policy "Admins can manage all blog posts"
  on blog_posts for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can view published content"
  on content_posts for select
  using (is_published = true);
create policy "Admins can manage all content posts"
  on content_posts for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Auth users can view published resources"
  on resources for select
  using (status = 'published' and auth.uid() is not null);
create policy "Admins can manage all resources"
  on resources for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Auth users can log resource events"
  on resource_events for insert
  with check (auth.uid() is not null);
create policy "Admins can view resource events"
  on resource_events for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can view published mass torts"
  on mass_torts for select
  using (is_published = true);
create policy "Admins can manage all mass torts"
  on mass_torts for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
