/**
 * Content service — BlogPost, ContentPost, Resource, ResourceEvent, MassTort.
 *
 * Read functions support dual providers (Base44 / Supabase) via feature flags.
 * Write functions remain on Base44 until the full cutover.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
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

// Write operations — dual provider
export async function createBlogPost(data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'createBlogPost');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('blog_posts')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'createBlogPost', 'base44');
  return base44.entities.BlogPost.create(data);
}

export async function updateBlogPost(id, data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'updateBlogPost');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('blog_posts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'updateBlogPost', 'base44');
  return base44.entities.BlogPost.update(id, data);
}

export async function deleteBlogPost(id) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'deleteBlogPost');
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      return;
    }
  }
  logProvider('content_read', 'deleteBlogPost', 'base44');
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

// Write operations — dual provider
export async function createResource(data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'createResource');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('resources')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'createResource', 'base44');
  return base44.entities.Resource.create(data);
}

export async function updateResource(id, data) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'updateResource');
    const sb = getSupabase();
    if (sb) {
      const { data: record, error } = await sb
        .from('resources')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return record;
    }
  }
  logProvider('content_read', 'updateResource', 'base44');
  return base44.entities.Resource.update(id, data);
}

export async function deleteResource(id) {
  if (useSupabase('content_read')) {
    logProvider('content_read', 'deleteResource');
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('resources').delete().eq('id', id);
      if (error) throw error;
      return;
    }
  }
  logProvider('content_read', 'deleteResource', 'base44');
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
