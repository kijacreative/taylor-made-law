/**
 * Shared CORS headers for Edge Functions.
 *
 * Usage:
 *   import { corsHeaders } from '../_shared/cors.ts';
 *   return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
