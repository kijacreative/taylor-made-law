/**
 * Edge Function: circles
 *
 * Replaces Base44 functions:
 *   - createCircleInvitation  (verify membership, create invite + notification + email)
 *   - sendCircleInviteEmail   (send invite email to network or non-network member)
 *   - notifyCircleMessage     (notify all circle members of new message)
 *
 * Simpler operations migrated to Postgres RPC:
 *   - acceptCircleInvite      -> RPC: accept_circle_invite
 *   - deleteCircleFile        -> RPC: delete_circle_file
 *   - submitCase (circle path) -> RPC: submit_case_to_circle
 *   - signDocument            -> RPC: sign_document
 *   - requestDocumentSignatures -> RPC: request_signatures
 *   - trackDocumentChanges    -> RPC: track_doc_changes
 *   - getDocumentHistory      -> RPC: get_document_history
 *
 * File uploads (uploadCircleFile, uploadCircleDocument) handled by direct
 * Supabase Storage upload from frontend. createDocumentVersion may remain as
 * Edge Function due to multi-step logic.
 *
 * Routes:
 *   POST { action: 'invite', circle_id, invitee_email, ... }
 *   POST { action: 'send_invite_email', invitee_email, circle_name, ... }
 *   POST { action: 'notify_message', circle_id, message_text, circle_name }
 *
 * External services: Resend (email)
 * Auth: User JWT required (circle membership verified)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getAuthUser, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { tmlEmailWrapper, tmlButton, tmlH1, tmlP, APP_URL } from '../_shared/email-templates.ts';

// ---------------------------------------------------------------------------
// Helper: get sender's display name from lawyer_profiles or profiles
// ---------------------------------------------------------------------------

async function getSenderName(
  sb: ReturnType<typeof createAdminClient>,
  userId: string,
  fallbackEmail: string,
): Promise<string> {
  const { data: lp } = await sb
    .from('lawyer_profiles')
    .select('full_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (lp?.full_name?.trim()) return lp.full_name.trim();

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.full_name?.trim()) return profile.full_name.trim();

  return fallbackEmail;
}

// ---------------------------------------------------------------------------
// Helper: generate a random invite token
// ---------------------------------------------------------------------------

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// createCircleInvitation (action: 'invite')
// ---------------------------------------------------------------------------

async function handleInvite(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const body = await req.json().catch(() => ({}));
  const {
    circle_id,
    invitee_email,
    invitee_name,
    invitee_user_id,
    message,
    circle_name,
  } = body;

  if (!circle_id || !invitee_email) {
    return errorResponse('Missing required fields: circle_id and invitee_email', 400);
  }

  const normalizedEmail = invitee_email.toLowerCase().trim();
  const sb = createAdminClient();

  // 1. Verify inviter is an active member of this circle
  const { data: membership, error: memErr } = await sb
    .from('legal_circle_members')
    .select('id')
    .eq('circle_id', circle_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (memErr) return errorResponse(memErr.message, 500);
  if (!membership) return errorResponse('You are not a member of this circle', 403);

  // 2. Verify invitee is not already an active member
  const { data: existingMember } = await sb
    .from('legal_circle_members')
    .select('id')
    .eq('circle_id', circle_id)
    .eq('user_email', normalizedEmail)
    .eq('status', 'active')
    .maybeSingle();

  if (existingMember) {
    return errorResponse('This attorney is already a member of this circle', 400);
  }

  // 3. Get inviter's full name
  const inviterFullName = await getSenderName(sb, user.id, profile.email);

  // 4. Generate token and create invitation
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: invErr } = await sb
    .from('legal_circle_invitations')
    .insert({
      circle_id,
      inviter_user_id: user.id,
      inviter_name: inviterFullName,
      invitee_email: normalizedEmail,
      invitee_name: invitee_name || '',
      token,
      message: message || '',
      status: 'pending',
      sent_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (invErr) return errorResponse(invErr.message, 500);

  // 5. Fire-and-forget: in-app notification (if invitee is an existing user)
  if (invitee_user_id) {
    sb.from('circle_notifications')
      .insert({
        user_id: invitee_user_id,
        user_email: normalizedEmail,
        circle_id,
        type: 'invite',
        title: "You've been invited to join a Legal Circle",
        body: `${inviterFullName} invited you to join "${circle_name || 'a circle'}" on TML Network.`,
        link: '/GroupInvitations',
        is_read: false,
      })
      .then(() => {})
      .catch(() => {});
  }

  // 6. Fire-and-forget: send invite email inline
  const resolvedCircleName = circle_name || 'Legal Circle';
  const subject = `${inviterFullName} invited you to join "${resolvedCircleName}" on Taylor Made Law`;
  const emailBody = buildNetworkMemberInviteEmail(inviterFullName, resolvedCircleName, message);

  sendEmail({
    to: normalizedEmail,
    subject,
    html: emailBody,
    from: 'Taylor Made Law <notifications@taylormadelaw.com>',
  }).catch(() => {});

  // 7. Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'LegalCircleInvitation',
      entity_id: invitation.id,
      action: 'create_circle_invitation',
      actor_id: profile.id,
      actor_email: profile.email,
      actor_role: profile.role,
      notes: `Invited ${normalizedEmail} to circle "${resolvedCircleName}"`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true, invitation_id: invitation.id } });
}

// ---------------------------------------------------------------------------
// sendCircleInviteEmail (action: 'send_invite_email')
// ---------------------------------------------------------------------------

async function handleSendInviteEmail(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const body = await req.json().catch(() => ({}));
  const {
    invitee_email,
    invitee_name,
    circle_name,
    circle_id,
    message,
    is_network_member,
  } = body;

  if (!invitee_email || !circle_name) {
    return errorResponse('Missing required fields: invitee_email and circle_name', 400);
  }

  const normalizedEmail = invitee_email.toLowerCase().trim();
  const sb = createAdminClient();
  const senderName = await getSenderName(sb, user.id, profile.email);

  let subject: string;
  let html: string;

  if (is_network_member) {
    // Existing TML member -- direct link to their invitations page
    subject = `${senderName} invited you to join "${circle_name}" on Taylor Made Law`;
    html = buildNetworkMemberInviteEmail(senderName, circle_name, message);
  } else {
    // Non-member -- create invitation with token and 30-day expiry
    const circleToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: invErr } = await sb
      .from('legal_circle_invitations')
      .insert({
        circle_id,
        inviter_user_id: user.id,
        inviter_name: senderName,
        invitee_email: normalizedEmail,
        invitee_name: invitee_name || '',
        token: circleToken,
        message: message || '',
        status: 'pending',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

    if (invErr) return errorResponse(invErr.message, 500);

    subject = `${senderName} invited you to join the Taylor Made Law Network`;
    html = buildNonMemberInviteEmail(senderName, circle_name, circleToken, invitee_name, message);
  }

  const result = await sendEmail({
    to: normalizedEmail,
    subject,
    html,
    from: 'Taylor Made Law <notifications@taylormadelaw.com>',
  });

  if (!result.success) {
    return jsonResponse({ data: { success: false, error: result.error } });
  }

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// notifyCircleMessage (action: 'notify_message')
// ---------------------------------------------------------------------------

async function handleNotifyMessage(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { user, profile } = auth;
  const body = await req.json().catch(() => ({}));
  const { circle_id, message_text, circle_name } = body;

  if (!circle_id || !message_text) {
    return errorResponse('Missing required fields: circle_id and message_text', 400);
  }

  const sb = createAdminClient();
  const circleName = circle_name || 'your Legal Circle';
  const senderName = await getSenderName(sb, user.id, profile.email);
  const preview = message_text.length > 120 ? message_text.substring(0, 120) + '...' : message_text;

  // Get all active members except the sender
  const { data: members, error: memErr } = await sb
    .from('legal_circle_members')
    .select('user_id, user_email')
    .eq('circle_id', circle_id)
    .eq('status', 'active')
    .neq('user_id', user.id);

  if (memErr) return errorResponse(memErr.message, 500);
  if (!members || members.length === 0) {
    return jsonResponse({ data: { notified: 0 } });
  }

  // Create in-app notifications (parallel, fire-and-forget)
  const notificationPromises = members.map((member) =>
    sb.from('circle_notifications')
      .insert({
        user_id: member.user_id,
        user_email: member.user_email,
        circle_id,
        type: 'new_message',
        title: `New message in ${circleName}`,
        body: `${senderName}: ${preview}`,
        link: `/GroupDetail?id=${circle_id}`,
        is_read: false,
        reference_id: null,
      })
      .then(() => {})
      .catch(() => null)
  );

  await Promise.all(notificationPromises);

  // Send email notifications (parallel, fire-and-forget)
  const emailHtml = buildMessageNotificationEmail(senderName, circleName, preview, circle_id);
  const emailPromises = members
    .filter((m) => m.user_email)
    .map((member) =>
      sendEmail({
        to: member.user_email,
        subject: `New message in ${circleName}`,
        html: emailHtml,
        from: 'Taylor Made Law <notifications@taylormadelaw.com>',
      }).catch(() => null)
    );

  await Promise.all(emailPromises);

  return jsonResponse({ data: { notified: members.length } });
}

// ---------------------------------------------------------------------------
// Email template builders
// ---------------------------------------------------------------------------

function buildNetworkMemberInviteEmail(
  senderName: string,
  circleName: string,
  message?: string,
): string {
  const messageBlock = message
    ? `<div style="background:#f9fafb;border-left:4px solid #3a164d;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;color:#374151;font-size:14px;font-style:italic;">"${escapeHtml(message)}"</p>
      </div>`
    : '';

  const body = `
    ${tmlH1("You've been invited to a Legal Circle")}
    ${tmlP(`<strong>${escapeHtml(senderName)}</strong> has invited you to join <strong>${escapeHtml(circleName)}</strong> on the Taylor Made Law Network.`)}
    ${messageBlock}
    ${tmlP('Log in to your dashboard to accept or decline this invitation.')}
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(`${APP_URL}/GroupInvitations`, 'View Invitation')}
    </div>
  `;
  return tmlEmailWrapper(body);
}

function buildNonMemberInviteEmail(
  senderName: string,
  circleName: string,
  circleToken: string,
  inviteeName?: string,
  message?: string,
): string {
  const signupUrl = `${APP_URL}/join-lawyer-network?circle_token=${circleToken}`;
  const nameClause = inviteeName ? `, ${escapeHtml(inviteeName)},` : '';

  const messageBlock = message
    ? `<div style="background:#f9fafb;border-left:4px solid #3a164d;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
        <p style="margin:0;color:#374151;font-size:14px;font-style:italic;">"${escapeHtml(message)}"</p>
      </div>`
    : '';

  const body = `
    ${tmlH1("You've been invited to join the Taylor Made Law Network")}
    ${tmlP(`<strong>${escapeHtml(senderName)}</strong> wants to connect with you${nameClause} on the Taylor Made Law attorney referral platform &mdash; and has reserved a spot for you in the <strong>${escapeHtml(circleName)}</strong> Legal Circle.`)}
    ${messageBlock}
    <div style="background:#faf8f5;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-weight:600;color:#111827;font-size:14px;">How it works:</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">1. Click the button below to apply to the network</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">2. Complete the short application (takes ~3 minutes)</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">3. Once approved, you'll automatically be added to <strong>${escapeHtml(circleName)}</strong></p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(signupUrl, `Apply &amp; Join ${escapeHtml(circleName)} &rarr;`)}
    </div>
    ${tmlP('<span style="color:#9ca3af;font-size:12px;">This invitation expires in 30 days.</span>')}
  `;
  return tmlEmailWrapper(body);
}

function buildMessageNotificationEmail(
  senderName: string,
  circleName: string,
  preview: string,
  circleId: string,
): string {
  const body = `
    ${tmlH1(`New message in <strong>${escapeHtml(circleName)}</strong>`)}
    ${tmlP(`From <strong>${escapeHtml(senderName)}</strong>`)}
    <div style="background:#f9fafb;border-left:4px solid #3a164d;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(preview)}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(`${APP_URL}/GroupDetail?id=${circleId}`, 'View Circle')}
    </div>
    ${tmlP('<span style="color:#9ca3af;font-size:12px;">You\'re receiving this because you\'re a member of this Legal Circle. To manage notifications, visit your settings.</span>')}
  `;
  return tmlEmailWrapper(body);
}

// ---------------------------------------------------------------------------
// Utility: basic HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// requestJoinCircle (action: 'request_join')
// ---------------------------------------------------------------------------

async function handleRequestJoin(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { profile } = auth;
  const body = await req.json().catch(() => ({}));
  const { circle_id } = body;
  if (!circle_id) return errorResponse('Missing circle_id', 400);

  const sb = createAdminClient();

  // Verify circle exists and is discoverable
  const { data: circle, error: circleErr } = await sb
    .from('legal_circles')
    .select('*')
    .eq('id', circle_id)
    .eq('is_active', true)
    .single();

  if (circleErr || !circle) return errorResponse('Circle not found', 404);
  if (circle.visibility !== 'discoverable') return errorResponse('This circle is not open for joining', 403);

  // Check not already a member
  const { data: existing } = await sb
    .from('legal_circle_members')
    .select('id, status')
    .eq('circle_id', circle_id)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing?.status === 'active') return errorResponse('You are already a member', 400);
  if (existing?.status === 'pending') return errorResponse('Your request is already pending', 400);

  const senderName = await getSenderName(sb, profile.id, profile.email);
  const now = new Date().toISOString();

  if (circle.require_admin_approval) {
    // Insert as pending member
    if (existing) {
      await sb.from('legal_circle_members').update({ status: 'pending' }).eq('id', existing.id);
    } else {
      await sb.from('legal_circle_members').insert({
        circle_id,
        user_id: profile.id,
        user_email: profile.email,
        user_name: senderName,
        full_name: senderName,
        role: 'member',
        status: 'pending',
        joined_at: now,
      });
    }

    // Notify circle admins
    const { data: admins } = await sb
      .from('legal_circle_members')
      .select('user_id, user_email')
      .eq('circle_id', circle_id)
      .eq('role', 'admin')
      .eq('status', 'active');

    if (admins?.length) {
      for (const admin of admins) {
        sb.from('circle_notifications').insert({
          user_id: admin.user_id,
          user_email: admin.user_email,
          circle_id,
          type: 'join_request',
          title: 'New Join Request',
          body: `${senderName} wants to join "${circle.name}"`,
          link: `/CircleMembers?id=${circle_id}`,
          is_read: false,
        }).then(() => {}).catch(() => {});

        sendEmail({
          to: admin.user_email,
          subject: `Join Request: ${senderName} wants to join "${circle.name}"`,
          html: tmlEmailWrapper(`
            ${tmlH1('New Join Request')}
            ${tmlP(`<strong>${escapeHtml(senderName)}</strong> (${escapeHtml(profile.email)}) has requested to join <strong>${escapeHtml(circle.name)}</strong>.`)}
            ${tmlButton(`${APP_URL}/CircleMembers?id=${circle_id}`, 'Review Request')}
          `),
          from: 'Taylor Made Law <notifications@taylormadelaw.com>',
        }).catch(() => {});
      }
    }

    sb.from('audit_logs').insert({
      entity_type: 'LegalCircleMember',
      action: 'request_join',
      actor_id: profile.id,
      actor_email: profile.email,
      actor_role: 'user',
      notes: `Requested to join circle "${circle.name}"`,
    }).then(() => {});

    return jsonResponse({ data: { success: true, requested: true } });
  }

  // No approval required — auto-join
  if (existing) {
    await sb.from('legal_circle_members').update({ status: 'active', joined_at: now }).eq('id', existing.id);
  } else {
    await sb.from('legal_circle_members').insert({
      circle_id,
      user_id: profile.id,
      user_email: profile.email,
      user_name: senderName,
      full_name: senderName,
      role: 'member',
      status: 'active',
      joined_at: now,
    });
  }

  // Increment member count
  await sb.from('legal_circles').update({ member_count: (circle.member_count || 0) + 1 }).eq('id', circle_id);

  sb.from('audit_logs').insert({
    entity_type: 'LegalCircleMember',
    action: 'auto_join',
    actor_id: profile.id,
    actor_email: profile.email,
    actor_role: 'user',
    notes: `Auto-joined circle "${circle.name}"`,
  }).then(() => {});

  return jsonResponse({ data: { success: true, joined: true } });
}

// ---------------------------------------------------------------------------
// approveMember (action: 'approve_member')
// ---------------------------------------------------------------------------

async function handleApproveMember(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { profile } = auth;
  const body = await req.json().catch(() => ({}));
  const { circle_id, member_id } = body;
  if (!circle_id || !member_id) return errorResponse('Missing circle_id or member_id', 400);

  const sb = createAdminClient();

  // Verify caller is circle admin
  const { data: callerMember } = await sb
    .from('legal_circle_members')
    .select('role')
    .eq('circle_id', circle_id)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  if (callerMember?.role !== 'admin') return errorResponse('Only circle admins can approve members', 403);

  // Get the pending member
  const { data: member, error: memErr } = await sb
    .from('legal_circle_members')
    .select('*')
    .eq('id', member_id)
    .eq('status', 'pending')
    .single();

  if (memErr || !member) return errorResponse('Pending member not found', 404);

  // Approve
  await sb.from('legal_circle_members').update({ status: 'active', joined_at: new Date().toISOString() }).eq('id', member_id);

  // Increment member count
  const { data: circle } = await sb.from('legal_circles').select('member_count, name').eq('id', circle_id).single();
  if (circle) {
    await sb.from('legal_circles').update({ member_count: (circle.member_count || 0) + 1 }).eq('id', circle_id);
  }

  // Notify the member
  sendEmail({
    to: member.user_email,
    subject: `You've been accepted to "${circle?.name || 'Legal Circle'}"`,
    html: tmlEmailWrapper(`
      ${tmlH1('Welcome to the Circle!')}
      ${tmlP(`Your request to join <strong>${escapeHtml(circle?.name || 'the circle')}</strong> has been approved.`)}
      ${tmlButton(`${APP_URL}/GroupDetail?id=${circle_id}`, 'Visit Circle')}
    `),
    from: 'Taylor Made Law <notifications@taylormadelaw.com>',
  }).catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// denyMember (action: 'deny_member')
// ---------------------------------------------------------------------------

async function handleDenyMember(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return errorResponse('Unauthorized', 401);

  const { profile } = auth;
  const body = await req.json().catch(() => ({}));
  const { circle_id, member_id } = body;
  if (!circle_id || !member_id) return errorResponse('Missing circle_id or member_id', 400);

  const sb = createAdminClient();

  // Verify caller is circle admin
  const { data: callerMember } = await sb
    .from('legal_circle_members')
    .select('role')
    .eq('circle_id', circle_id)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  if (callerMember?.role !== 'admin') return errorResponse('Only circle admins can deny members', 403);

  // Get the pending member
  const { data: member, error: memErr } = await sb
    .from('legal_circle_members')
    .select('*')
    .eq('id', member_id)
    .eq('status', 'pending')
    .single();

  if (memErr || !member) return errorResponse('Pending member not found', 404);

  // Decline
  await sb.from('legal_circle_members').update({ status: 'declined' }).eq('id', member_id);

  // Notify the member
  const { data: circle } = await sb.from('legal_circles').select('name').eq('id', circle_id).single();

  sendEmail({
    to: member.user_email,
    subject: `Update on your request to join "${circle?.name || 'Legal Circle'}"`,
    html: tmlEmailWrapper(`
      ${tmlH1('Request Update')}
      ${tmlP(`Your request to join <strong>${escapeHtml(circle?.name || 'the circle')}</strong> was not approved at this time.`)}
      ${tmlP('You can explore other circles or reach out to the circle administrator for more information.')}
      ${tmlButton(`${APP_URL}/Groups`, 'Browse Circles')}
    `),
    from: 'Taylor Made Law <notifications@taylormadelaw.com>',
  }).catch(() => {});

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
      case 'invite': return await handleInvite(req);
      case 'send_invite_email': return await handleSendInviteEmail(req);
      case 'notify_message': return await handleNotifyMessage(req);
      case 'request_join': return await handleRequestJoin(req);
      case 'approve_member': return await handleApproveMember(req);
      case 'deny_member': return await handleDenyMember(req);
      default: return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('circles function error:', err);
    return errorResponse(err.message || 'Internal error', 500);
  }
});
