-- 00010_fix_rls_recursion.sql
-- Fix infinite recursion in RLS policies that check profiles.role from within profiles policies.
--
-- Problem: Policies on "profiles" that use EXISTS(SELECT FROM profiles WHERE role='admin')
-- cause infinite recursion because reading profiles triggers the same policies.
--
-- Solution: Create a SECURITY DEFINER function that reads profiles.role without triggering RLS.
-- All policies that need to check "is this user an admin?" call this function instead.

-- ============================================================================
-- Admin check function (bypasses RLS on profiles table)
-- ============================================================================

create or replace function is_admin(p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = p_user_id and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================================
-- Drop and recreate affected policies on profiles
-- ============================================================================

-- Drop the recursive admin policies on profiles
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;

-- Recreate using the SECURITY DEFINER function
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin(auth.uid()));

create policy "Admins can update all profiles"
  on profiles for update
  using (is_admin(auth.uid()));

-- ============================================================================
-- Fix all other tables that reference profiles for admin check
-- ============================================================================

-- lawyer_profiles
drop policy if exists "Admins can manage all lawyer profiles" on lawyer_profiles;
create policy "Admins can manage all lawyer profiles"
  on lawyer_profiles for all
  using (is_admin(auth.uid()));

-- lawyer_applications
drop policy if exists "Admins can manage all applications" on lawyer_applications;
create policy "Admins can manage all applications"
  on lawyer_applications for all
  using (is_admin(auth.uid()));

-- leads
drop policy if exists "Admins can manage leads" on leads;
create policy "Admins can manage leads"
  on leads for all
  using (is_admin(auth.uid()));

-- cases
drop policy if exists "Admins can manage all cases" on cases;
create policy "Admins can manage all cases"
  on cases for all
  using (is_admin(auth.uid()));

-- legal_circles
drop policy if exists "Admins can manage all circles" on legal_circles;
create policy "Admins can manage all circles"
  on legal_circles for all
  using (is_admin(auth.uid()));

-- legal_circle_members
drop policy if exists "Admins can manage all members" on legal_circle_members;
create policy "Admins can manage all members"
  on legal_circle_members for all
  using (is_admin(auth.uid()));

-- legal_circle_invitations
drop policy if exists "Admins can manage all invitations" on legal_circle_invitations;
create policy "Admins can manage all invitations"
  on legal_circle_invitations for all
  using (is_admin(auth.uid()));

-- circle_messages
drop policy if exists "Admins can manage all circle messages" on circle_messages;
create policy "Admins can manage all circle messages"
  on circle_messages for all
  using (is_admin(auth.uid()));

-- blog_posts
drop policy if exists "Admins can manage all blog posts" on blog_posts;
create policy "Admins can manage all blog posts"
  on blog_posts for all
  using (is_admin(auth.uid()));

-- content_posts
drop policy if exists "Admins can manage all content posts" on content_posts;
create policy "Admins can manage all content posts"
  on content_posts for all
  using (is_admin(auth.uid()));

-- resources
drop policy if exists "Admins can manage all resources" on resources;
create policy "Admins can manage all resources"
  on resources for all
  using (is_admin(auth.uid()));

-- mass_torts
drop policy if exists "Admins can manage all mass torts" on mass_torts;
create policy "Admins can manage all mass torts"
  on mass_torts for all
  using (is_admin(auth.uid()));

-- popups
drop policy if exists "Admins can manage all popups" on popups;
create policy "Admins can manage all popups"
  on popups for all
  using (is_admin(auth.uid()));

-- audit_logs
drop policy if exists "Admins can view audit logs" on audit_logs;
create policy "Admins can view audit logs"
  on audit_logs for select
  using (is_admin(auth.uid()));

-- consent_logs
drop policy if exists "Admins can view consent logs" on consent_logs;
create policy "Admins can view consent logs"
  on consent_logs for select
  using (is_admin(auth.uid()));

-- invitations
drop policy if exists "Admins can view invitations" on invitations;
create policy "Admins can view invitations"
  on invitations for select
  using (is_admin(auth.uid()));

-- resource_events
drop policy if exists "Admins can view resource events" on resource_events;
create policy "Admins can view resource events"
  on resource_events for select
  using (is_admin(auth.uid()));

-- popup_impressions
drop policy if exists "Admins can view all impressions" on popup_impressions;
create policy "Admins can view all impressions"
  on popup_impressions for select
  using (is_admin(auth.uid()));

-- cases: approved lawyers check also needs fix
drop policy if exists "Approved lawyers can view published cases" on cases;
create policy "Approved lawyers can view published cases"
  on cases for select
  using (
    status = 'published' and
    exists (
      select 1 from profiles
      where id = auth.uid() and user_status = 'approved'
    )
  );
-- Note: This profiles lookup is safe because profiles' own policies
-- don't recursively reference cases. The recursion only happens when
-- profiles policies reference profiles itself.
