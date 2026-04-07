/**
 * Supabase client — initialized from env vars.
 *
 * Only used when a VITE_PROVIDER_* flag is set to 'supabase'.
 * In pure Base44/mock mode, this module is imported but the client
 * is only created if credentials are present.
 */
import { createClient } from '@supabase/supabase-js';

// Trim to handle Vercel CLI injecting trailing \n characters
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabaseInstance = null;

export function getSupabase() {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — Supabase client unavailable');
      return null;
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}
