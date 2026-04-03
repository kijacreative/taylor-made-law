/**
 * Edge Function: cases
 *
 * Actions:
 *   POST { action: 'list' }              → getCasesForLawyer (teaser/full based on approval)
 *   POST { action: 'accept', caseId }    → acceptCase (verify approved+paid, update case)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getAuthUser, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

const TEASER_FIELDS = ['id', 'title', 'state', 'practice_area', 'status', 'is_trending', 'published_at', 'created_at'];

// ---------------------------------------------------------------------------
// getCasesForLawyer — conditional data return based on approval
// ---------------------------------------------------------------------------

async function handleList(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { profile } = auth;
  const sb = createAdminClient();

  // Check approval status
  const isApproved = profile.user_status === 'approved';
  let profileApproved = isApproved;

  if (!isApproved) {
    const { data: lp } = await sb
      .from('lawyer_profiles')
      .select('status')
      .eq('user_id', profile.id)
      .maybeSingle();
    profileApproved = lp?.status === 'approved';
  }

  // Fetch published cases
  const { data: cases, error } = await sb
    .from('cases')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const allCases = cases || [];

  // Compute stats
  const stats = {
    total: allCases.length,
    byState: {} as Record<string, number>,
    byPracticeArea: {} as Record<string, number>,
  };
  for (const c of allCases) {
    if (c.state) stats.byState[c.state] = (stats.byState[c.state] || 0) + 1;
    if (c.practice_area) stats.byPracticeArea[c.practice_area] = (stats.byPracticeArea[c.practice_area] || 0) + 1;
  }

  // Return teaser or full data
  const approved = isApproved || profileApproved;
  const responseCases = approved
    ? allCases
    : allCases.map(c => {
        const teaser: Record<string, unknown> = {};
        for (const key of TEASER_FIELDS) teaser[key] = c[key];
        return teaser;
      });

  return jsonResponse({ data: { approved, stats, cases: responseCases } });
}

// ---------------------------------------------------------------------------
// acceptCase — verify approved+paid, update case
// ---------------------------------------------------------------------------

async function handleAccept(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const body = await req.json().catch(() => ({}));
  const caseId = body.caseId;
  if (!caseId) return errorResponse('Missing caseId', 400);

  const sb = createAdminClient();

  // Fetch case
  const { data: caseRow, error: caseErr } = await sb
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (caseErr || !caseRow) return errorResponse('Case not found', 404);
  if (caseRow.status !== 'published') return errorResponse('Case is no longer available', 409);

  // Verify approval
  const isApproved = profile.user_status === 'approved';
  if (!isApproved) {
    const { data: lp } = await sb
      .from('lawyer_profiles')
      .select('status')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (lp?.status !== 'approved') return errorResponse('Account must be approved to accept cases', 403);
  }

  // Verify paid
  if (profile.membership_status !== 'paid') {
    return errorResponse('A paid membership is required to accept cases', 403);
  }

  // Get lawyer profile for accepted_by
  const { data: lawyerProfile } = await sb
    .from('lawyer_profiles')
    .select('id')
    .eq('user_id', profile.id)
    .maybeSingle();

  // Update case
  const { error: updateErr } = await sb
    .from('cases')
    .update({
      status: 'accepted',
      accepted_by: lawyerProfile?.id || null,
      accepted_by_email: profile.email,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', caseId);

  if (updateErr) return errorResponse(updateErr.message, 500);

  // Audit log (fire-and-forget)
  sb.from('audit_logs').insert({
    entity_type: 'Case',
    entity_id: caseId,
    action: 'accept_case',
    actor_id: profile.id,
    actor_email: profile.email,
    actor_role: 'user',
    notes: `Case "${caseRow.title}" accepted`,
  }).then(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'list': return await handleList(req);
      case 'accept': return await handleAccept(req);
      default: return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('cases function error:', err);
    return errorResponse(err.message || 'Internal error', 500);
  }
});
