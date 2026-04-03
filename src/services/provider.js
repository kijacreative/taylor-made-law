/**
 * Provider feature flags — controls which backend serves each domain.
 *
 * Each domain can be set independently via VITE_PROVIDER_* env vars.
 * Default is 'base44' for all domains (safe fallback).
 *
 * Usage in services:
 *   import { useSupabase, logProvider } from './provider.js';
 *
 *   if (useSupabase('content_read')) {
 *     logProvider('content_read', 'listPublishedPosts');
 *     return supabaseImpl();
 *   }
 *   logProvider('content_read', 'listPublishedPosts', 'base44');
 *   return base44Impl();
 *
 * Rollback: set env var to 'base44' or remove it, restart dev server.
 */

const PROVIDERS = {
  content_read:  import.meta.env.VITE_PROVIDER_CONTENT_READ  || 'base44',
  profile_read:  import.meta.env.VITE_PROVIDER_PROFILE_READ  || 'base44',
  cases_read:    import.meta.env.VITE_PROVIDER_CASES_READ    || 'base44',
  circles_read:  import.meta.env.VITE_PROVIDER_CIRCLES_READ  || 'base44',
  messaging_read: import.meta.env.VITE_PROVIDER_MESSAGING_READ || 'base44',
  auth:           import.meta.env.VITE_PROVIDER_AUTH            || 'base44',
  // Future domains:
  // content_write: import.meta.env.VITE_PROVIDER_CONTENT_WRITE || 'base44',
  // cases_write:   import.meta.env.VITE_PROVIDER_CASES_WRITE   || 'base44',
};

/**
 * Check if a domain should use Supabase.
 * Returns false if the domain isn't registered or is set to 'base44'.
 */
export function useSupabase(domain) {
  return PROVIDERS[domain] === 'supabase';
}

/**
 * Log which provider served a request. Only logs in dev mode.
 * @param {string} domain - Feature flag domain (e.g., 'content_read')
 * @param {string} fn - Function name (e.g., 'listPublishedPosts')
 * @param {string} [provider] - Override; if omitted, reads from PROVIDERS
 */
export function logProvider(domain, fn, provider) {
  if (import.meta.env.PROD) return; // silent in production
  const p = provider || PROVIDERS[domain] || 'base44';
  console.log(
    `%c[PROVIDER:${p}] ${domain}: ${fn}`,
    p === 'supabase' ? 'color: #3ecf8e; font-weight: bold' : 'color: #a47864'
  );
}

// Log active provider config on startup (dev only)
if (!import.meta.env.PROD) {
  const active = Object.entries(PROVIDERS)
    .filter(([, v]) => v === 'supabase')
    .map(([k]) => k);
  if (active.length > 0) {
    console.log(
      `%c[PROVIDER] Supabase active for: ${active.join(', ')}`,
      'color: #3ecf8e; font-weight: bold; font-size: 12px'
    );
  }
}
