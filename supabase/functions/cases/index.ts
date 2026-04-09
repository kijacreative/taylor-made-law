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
import { sendEmail } from '../_shared/resend.ts';
import { tmlEmailWrapper, tmlH1, tmlP, tmlButton, APP_URL } from '../_shared/email-templates.ts';

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

  // Verify subscription: paid, trial, or past_due all have full access
  // Only 'none'/'cancelled' are blocked from accepting cases
  const sub = profile.membership_status || profile.subscription_status || 'none';
  if (!['paid', 'trial', 'past_due', 'active'].includes(sub)) {
    return errorResponse('A subscription or active trial is required to accept cases', 403);
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
// submitLead — public intake (no auth required)
// ---------------------------------------------------------------------------

async function handleSubmitLead(req: Request) {
  const body = await req.json().catch(() => ({}));

  const {
    first_name, last_name, email, phone,
    practice_area, state, description, urgency,
    consent_given, consent_version, consent_text,
  } = body;

  // Basic validation
  if (!first_name || !last_name || !email) {
    return errorResponse('Name and email are required', 400);
  }

  const sb = createAdminClient();

  // 1. Create lead
  const { data: lead, error: leadErr } = await sb
    .from('leads')
    .insert({
      first_name,
      last_name,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      practice_area: practice_area || null,
      state: state || null,
      description: description || null,
      urgency: urgency || 'medium',
      status: 'new',
      source: 'website',
    })
    .select()
    .single();

  if (leadErr) {
    console.error('Lead insert error:', leadErr);
    return errorResponse(leadErr.message, 500);
  }

  // 2. Sync to Lead Docket (server-side, no CORS issues)
  try {
    const ldRes = await fetch('https://taylormadelaw.leaddocket.com/Opportunities/FormJson/1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name, last_name, email, phone,
        state, practice_area, description, urgency,
      }),
    });
    const ldBody = await ldRes.json().catch(() => ({}));
    if (ldBody.success && ldBody.opportunityId) {
      await sb.from('leads').update({
        sync_status: 'sent',
        lead_docket_id: String(ldBody.opportunityId),
        last_sync_attempt_at: new Date().toISOString(),
      }).eq('id', lead.id);
    } else {
      await sb.from('leads').update({
        sync_status: 'failed',
        sync_error_message: ldBody.message || 'Unknown error',
        last_sync_attempt_at: new Date().toISOString(),
      }).eq('id', lead.id);
    }
  } catch (syncErr) {
    console.error('Lead Docket sync failed:', syncErr);
    await sb.from('leads').update({
      sync_status: 'failed',
      sync_error_message: (syncErr as Error).message || 'Network error',
      last_sync_attempt_at: new Date().toISOString(),
    }).eq('id', lead.id);
  }

  // 3. Create consent log (fire-and-forget)
  // (renumbered after Lead Docket sync insertion)
  if (consent_given) {
    sb.from('consent_logs').insert({
      consent_type: 'terms',
      consent_version: consent_version || '1.0.0',
      consent_text: consent_text || '',
      accepted: true,
      consented_at: new Date().toISOString(),
    }).then(() => {});
  }

  // 3. Create audit log (fire-and-forget)
  sb.from('audit_logs').insert({
    entity_type: 'Lead',
    entity_id: lead.id,
    action: 'lead_submitted',
    actor_email: email.toLowerCase().trim(),
    actor_role: 'public',
    notes: `Public lead intake: ${practice_area || 'General'} in ${state || 'Unspecified'}`,
  }).then(() => {});

  // 4. Send confirmation email to client (fire-and-forget)
  sendEmail({
    to: email.toLowerCase().trim(),
    subject: 'We Received Your Request — Taylor Made Law',
    html: tmlEmailWrapper(`
      ${tmlH1('Thank You for Reaching Out')}
      ${tmlP(`Dear ${first_name},`)}
      ${tmlP('We have received your request and a qualified attorney from our network will be in touch with you shortly.')}
      ${tmlP(`<strong>Practice Area:</strong> ${practice_area || 'Not specified'}<br><strong>State:</strong> ${state || 'Not specified'}<br><strong>Urgency:</strong> ${urgency || 'Medium'}`)}
      ${tmlP('If you have any immediate questions, please don\'t hesitate to contact our support team.')}
      ${tmlButton(`mailto:support@taylormadelaw.com`, 'Contact Support')}
    `),
  }).catch(err => console.error('Client email failed:', err));

  // 5. Notify admin users (fire-and-forget)
  const { data: admins } = await sb
    .from('profiles')
    .select('email')
    .eq('role', 'admin');

  if (admins?.length) {
    const adminEmails = admins.map((a: { email: string }) => a.email);
    sendEmail({
      to: adminEmails,
      subject: `New Lead: ${first_name} ${last_name} — ${practice_area || 'General'}`,
      html: tmlEmailWrapper(`
        ${tmlH1('New Lead Submitted')}
        ${tmlP(`<strong>Name:</strong> ${first_name} ${last_name}`)}
        ${tmlP(`<strong>Email:</strong> ${email}`)}
        ${tmlP(`<strong>Phone:</strong> ${phone || 'Not provided'}`)}
        ${tmlP(`<strong>Practice Area:</strong> ${practice_area || 'Not specified'}`)}
        ${tmlP(`<strong>State:</strong> ${state || 'Not specified'}`)}
        ${tmlP(`<strong>Urgency:</strong> ${urgency || 'Medium'}`)}
        ${tmlP(`<strong>Description:</strong> ${description || 'None provided'}`)}
        ${tmlButton(`${APP_URL}/AdminLeads`, 'Review in Dashboard')}
      `),
    }).catch(err => console.error('Admin email failed:', err));
  }

  return jsonResponse({ data: { success: true, lead_id: lead.id } });
}

// ---------------------------------------------------------------------------
// sendNotification — send branded email to all admins (auth required)
// ---------------------------------------------------------------------------

async function handleSendNotification(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const { subject, body_text, body_html, to_email } = body;

  if (!subject) return errorResponse('Missing subject', 400);

  const sb = createAdminClient();

  // Get admin emails
  const { data: admins } = await sb
    .from('profiles')
    .select('email')
    .eq('role', 'admin');

  const recipients: string[] = [];
  if (to_email) recipients.push(to_email);
  if (admins?.length) {
    admins.forEach((a: { email: string }) => {
      if (!recipients.includes(a.email)) recipients.push(a.email);
    });
  }

  if (recipients.length === 0) {
    return errorResponse('No recipients found', 400);
  }

  // Build HTML from body_html or plain text
  const html = body_html
    ? tmlEmailWrapper(body_html)
    : tmlEmailWrapper(
        (body_text || '').split('\n').map((line: string) =>
          line.trim() ? tmlP(line) : '<br/>'
        ).join('')
      );

  await sendEmail({ to: recipients, subject, html });

  return jsonResponse({ data: { success: true, recipients_count: recipients.length } });
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
      case 'submit_lead': return await handleSubmitLead(req);
      case 'send_notification': return await handleSendNotification(req);
      default: return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('cases function error:', err);
    return errorResponse(err.message || 'Internal error', 500);
  }
});
