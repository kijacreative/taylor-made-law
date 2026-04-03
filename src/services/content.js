/**
 * Content service — BlogPost, ContentPost, Resource, ResourceEvent, MassTort.
 *
 * Read functions support dual providers (Base44 / Supabase) via feature flags.
 * Write functions remain on Base44 until the full cutover.
 */
import { base44 } from '@/api/base44Client';
import { supabaseQuery } from './supabase-helpers';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// BlogPost
// ---------------------------------------------------------------------------

export function listBlogPosts(sort = '-created_date') {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'listBlogPosts');
    return supabaseQuery('blog_posts', { sort });
  }
  logProvider('content_read', 'listBlogPosts', 'base44');
  return base44.entities.BlogPost.list(sort);
}

export function filterBlogPosts(query, sort) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterBlogPosts');
    return supabaseQuery('blog_posts', { filters: query, sort });
  }
  logProvider('content_read', 'filterBlogPosts', 'base44');
  return base44.entities.BlogPost.filter(query, sort);
}

export function listPublishedPosts(sort = '-published_at') {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'listPublishedPosts');
    return supabaseQuery('blog_posts', { filters: { status: 'published' }, sort });
  }
  logProvider('content_read', 'listPublishedPosts', 'base44');
  return base44.entities.BlogPost.filter({ status: 'published' }, sort);
}

// Write operations — Base44 only (no feature flag yet)
export function createBlogPost(data) {
  return base44.entities.BlogPost.create(data);
}

export function updateBlogPost(id, data) {
  return base44.entities.BlogPost.update(id, data);
}

export function deleteBlogPost(id) {
  return base44.entities.BlogPost.delete(id);
}

// ---------------------------------------------------------------------------
// ContentPost
// ---------------------------------------------------------------------------

export function filterContentPosts(query, sort) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterContentPosts');
    // Base44 uses is_published; Supabase table also has is_published column
    return supabaseQuery('content_posts', { filters: query, sort });
  }
  logProvider('content_read', 'filterContentPosts', 'base44');
  return base44.entities.ContentPost.filter(query, sort);
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export function listResources(sort = '-updated_date', limit = 200) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'listResources');
    return supabaseQuery('resources', { sort, limit });
  }
  logProvider('content_read', 'listResources', 'base44');
  return base44.entities.Resource.list(sort, limit);
}

export function filterResources(query) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterResources');
    return supabaseQuery('resources', { filters: query });
  }
  logProvider('content_read', 'filterResources', 'base44');
  return base44.entities.Resource.filter(query);
}

// Write operations — Base44 only
export function createResource(data) {
  return base44.entities.Resource.create(data);
}

export function updateResource(id, data) {
  return base44.entities.Resource.update(id, data);
}

export function deleteResource(id) {
  return base44.entities.Resource.delete(id);
}

// ---------------------------------------------------------------------------
// ResourceEvent
// ---------------------------------------------------------------------------

export function listResourceEvents(sort = '-created_date', limit = 1000) {
  return base44.entities.ResourceEvent.list(sort, limit);
}

export function createResourceEvent(data) {
  return base44.entities.ResourceEvent.create(data);
}

// ---------------------------------------------------------------------------
// MassTort
// ---------------------------------------------------------------------------

export function filterMassTorts(query, sort) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'filterMassTorts');
    return supabaseQuery('mass_torts', { filters: query, sort });
  }
  logProvider('content_read', 'filterMassTorts', 'base44');
  return base44.entities.MassTort.filter(query, sort);
}
