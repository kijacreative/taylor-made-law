/**
 * Shared Supabase admin client for Edge Functions.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS — Edge Functions act as admin.
 * Also provides user extraction from JWT for auth-required endpoints.
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

let _adminClient: SupabaseClient | null = null;

/** Create or reuse a Supabase admin client (service_role key, bypasses RLS). */
export function createAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  _adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return _adminClient;
}

/** Profile row shape (subset of profiles table). */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  user_type: string | null;
  user_status: 'invited' | 'pending' | 'approved' | 'disabled';
  membership_status: 'paid' | 'trial' | 'none' | null;
  subscription_status: string | null;
  firm_name: string | null;
  [key: string]: unknown;
}

/**
 * Extract authenticated user + profile from request JWT.
 * Returns null if no valid JWT present.
 */
export async function getAuthUser(req: Request): Promise<{ user: User; profile: Profile } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const sb = createAdminClient();

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { user, profile: profile as Profile };
}

/** JSON response helper with CORS headers. */
export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...headers,
    },
  });
}

/** Error response helper. */
export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
