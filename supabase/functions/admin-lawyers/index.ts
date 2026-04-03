/**
 * Edge Function: admin-lawyers
 *
 * Replaces 11 Base44 functions for admin attorney management.
 * ALL actions require admin JWT.
 *
 * Routes (via action parameter):
 *   POST { action: 'approve_lawyer', user_id, free_trial_months? }
 *   POST { action: 'approve_application', application_id, free_trial_months? }
 *   POST { action: 'review_application', application_id, review_action, reason?, message? }
 *   POST { action: 'disable', user_id, reason? }
 *   POST { action: 'reinstate', user_id, reinstate_to_status? }
 *   POST { action: 'reject', user_id, reason? }
 *   POST { action: 'invite_attorney', email, full_name?, firm_name?, states_served?, practice_areas? }
 *   POST { action: 'invite_admin', email }
 *   POST { action: 'generate_report' }
 *
 * External services: Resend (email)
 * Auth: Admin JWT required
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getAuthUser, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { tmlEmailWrapper, tmlButton, tmlH1, tmlP, APP_URL } from '../_shared/email-templates.ts';

// ---------------------------------------------------------------------------
// Shared: require admin auth
// ---------------------------------------------------------------------------

async function requireAdmin(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false as const, response: errorResponse('Unauthorized', 401) };
  if (auth.profile.role !== 'admin') return { ok: false as const, response: errorResponse('Admin access required', 403) };
  return { ok: true as const, auth };
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
// Utility: compute trial end date
// ---------------------------------------------------------------------------

function trialEndDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// 1. approve_lawyer
// ---------------------------------------------------------------------------

async function handleApproveLawyer(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { user_id, free_trial_months } = body;

  if (!user_id) return errorResponse('Missing user_id', 400);

  const sb = createAdminClient();

  // Fetch target profile
  const { data: target, error: fetchErr } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .single();

  if (fetchErr || !target) return errorResponse('User not found', 404);

  // Build profile update
  const profileUpdate: Record<string, unknown> = {
    user_status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: auth.profile.email,
  };

  if (free_trial_months && free_trial_months > 0) {
    profileUpdate.subscription_status = 'trial';
    profileUpdate.membership_status = 'trial';
    profileUpdate.free_trial_months = free_trial_months;
    profileUpdate.trial_ends_at = trialEndDate(free_trial_months);
  }

  const { error: profileErr } = await sb
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user_id);

  if (profileErr) return errorResponse(profileErr.message, 500);

  // Upsert lawyer_profiles
  const lawyerProfileData: Record<string, unknown> = {
    user_id,
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: auth.profile.email,
    full_name: target.full_name,
    email: target.email,
    firm_name: target.firm_name,
  };

  if (free_trial_months && free_trial_months > 0) {
    lawyerProfileData.subscription_status = 'trial';
    lawyerProfileData.free_trial_months = free_trial_months;
    lawyerProfileData.trial_ends_at = trialEndDate(free_trial_months);
  }

  const { error: lpErr } = await sb
    .from('lawyer_profiles')
    .upsert(lawyerProfileData, { onConflict: 'user_id' });

  if (lpErr) return errorResponse(lpErr.message, 500);

  // Send approval email (fire-and-forget)
  const displayName = target.full_name || target.email;
  sendEmail({
    to: target.email,
    subject: "You're Approved \u2014 Cases Are Now Unlocked",
    html: buildApprovalEmail(displayName),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: user_id,
      action: 'approve_lawyer',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Approved lawyer ${target.email}${free_trial_months ? ` with ${free_trial_months}-month trial` : ''}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// 2. approve_application
// ---------------------------------------------------------------------------

async function handleApproveApplication(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { application_id, free_trial_months } = body;

  if (!application_id) return errorResponse('Missing application_id', 400);

  const sb = createAdminClient();

  // Fetch application
  const { data: app, error: appErr } = await sb
    .from('lawyer_applications')
    .select('*')
    .eq('id', application_id)
    .single();

  if (appErr || !app) return errorResponse('Application not found', 404);

  // Update application status
  const { error: appUpdateErr } = await sb
    .from('lawyer_applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.profile.email,
    })
    .eq('id', application_id);

  if (appUpdateErr) return errorResponse(appUpdateErr.message, 500);

  // Update profiles if user_id is linked
  if (app.user_id) {
    const profileUpdate: Record<string, unknown> = {
      user_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: auth.profile.email,
    };

    if (free_trial_months && free_trial_months > 0) {
      profileUpdate.subscription_status = 'trial';
      profileUpdate.membership_status = 'trial';
      profileUpdate.free_trial_months = free_trial_months;
      profileUpdate.trial_ends_at = trialEndDate(free_trial_months);
    }

    await sb.from('profiles').update(profileUpdate).eq('id', app.user_id);

    // Upsert lawyer_profiles
    const lpData: Record<string, unknown> = {
      user_id: app.user_id,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: auth.profile.email,
      full_name: app.full_name,
      email: app.email,
      firm_name: app.firm_name,
      phone: app.phone,
      bar_number: app.bar_number,
      bar_numbers: app.bar_numbers,
      states_licensed: app.states_licensed,
      practice_areas: app.practice_areas,
      years_experience: app.years_experience,
      bio: app.bio,
    };

    if (free_trial_months && free_trial_months > 0) {
      lpData.subscription_status = 'trial';
      lpData.free_trial_months = free_trial_months;
      lpData.trial_ends_at = trialEndDate(free_trial_months);
    }

    await sb.from('lawyer_profiles').upsert(lpData, { onConflict: 'user_id' });
  }

  // Check for pending circle invitation and auto-add
  if (app.circle_id && app.user_id) {
    const normalizedEmail = app.email.toLowerCase().trim();

    // Find pending circle invitation
    const { data: circleInvite } = await sb
      .from('legal_circle_invitations')
      .select('id, circle_id')
      .eq('circle_id', app.circle_id)
      .eq('invitee_email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (circleInvite) {
      // Auto-create circle membership
      await sb.from('legal_circle_members').upsert(
        {
          circle_id: circleInvite.circle_id,
          user_id: app.user_id,
          user_email: normalizedEmail,
          user_name: app.full_name,
          full_name: app.full_name,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'circle_id,user_id' },
      );

      // Mark invitation accepted
      await sb
        .from('legal_circle_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', circleInvite.id);

      // Increment member_count (fire-and-forget)
      sb.rpc('increment_member_count', { cid: circleInvite.circle_id }).catch(() => {
        // Fallback: manual increment if RPC not available
        sb.from('legal_circles')
          .select('member_count')
          .eq('id', circleInvite.circle_id)
          .single()
          .then(({ data }) => {
            if (data) {
              sb.from('legal_circles')
                .update({ member_count: (data.member_count || 0) + 1 })
                .eq('id', circleInvite.circle_id)
                .then(() => {});
            }
          });
      });
    }
  }

  // Send approval email (fire-and-forget)
  const displayName = app.full_name || app.email;
  sendEmail({
    to: app.email,
    subject: "You're Approved \u2014 Cases Are Now Unlocked",
    html: buildApprovalEmail(displayName),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'LawyerApplication',
      entity_id: application_id,
      action: 'approve_application',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Approved application for ${app.email}${free_trial_months ? ` with ${free_trial_months}-month trial` : ''}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// 3. review_application (3 sub-actions)
// ---------------------------------------------------------------------------

async function handleReviewApplication(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { application_id, review_action, reason, message } = body;

  if (!application_id) return errorResponse('Missing application_id', 400);
  if (!review_action) return errorResponse('Missing review_action', 400);

  const sb = createAdminClient();

  // Fetch application
  const { data: app, error: appErr } = await sb
    .from('lawyer_applications')
    .select('*')
    .eq('id', application_id)
    .single();

  if (appErr || !app) return errorResponse('Application not found', 404);

  const displayName = app.full_name || app.email;

  switch (review_action) {
    case 'approve': {
      // Update application
      await sb
        .from('lawyer_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.profile.email,
        })
        .eq('id', application_id);

      // Update profile if linked
      if (app.user_id) {
        await sb
          .from('profiles')
          .update({
            user_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: auth.profile.email,
          })
          .eq('id', app.user_id);

        await sb.from('lawyer_profiles').upsert(
          {
            user_id: app.user_id,
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: auth.profile.email,
            full_name: app.full_name,
            email: app.email,
            firm_name: app.firm_name,
          },
          { onConflict: 'user_id' },
        );
      }

      // Send approval email
      sendEmail({
        to: app.email,
        subject: "You're Approved \u2014 Cases Are Now Unlocked",
        html: buildApprovalEmail(displayName),
      }).catch(() => {});

      // Audit
      sb.from('audit_logs')
        .insert({
          entity_type: 'LawyerApplication',
          entity_id: application_id,
          action: 'review_approve',
          actor_id: auth.profile.id,
          actor_email: auth.profile.email,
          actor_role: 'admin',
          notes: `Approved application for ${app.email}`,
        })
        .then(() => {})
        .catch(() => {});

      return jsonResponse({ data: { success: true, review_action: 'approve' } });
    }

    case 'disable': {
      // Update application
      await sb
        .from('lawyer_applications')
        .update({
          status: 'disabled',
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.profile.email,
        })
        .eq('id', application_id);

      // Update profile if linked
      if (app.user_id) {
        await sb
          .from('profiles')
          .update({
            user_status: 'disabled',
            disabled_at: new Date().toISOString(),
            disabled_by: auth.profile.email,
            disabled_reason: reason || null,
          })
          .eq('id', app.user_id);
      }

      // Send disable email
      sendEmail({
        to: app.email,
        subject: 'Account Access Update',
        html: buildDisableEmail(displayName, reason),
      }).catch(() => {});

      // Audit
      sb.from('audit_logs')
        .insert({
          entity_type: 'LawyerApplication',
          entity_id: application_id,
          action: 'review_disable',
          actor_id: auth.profile.id,
          actor_email: auth.profile.email,
          actor_role: 'admin',
          notes: `Disabled application for ${app.email}${reason ? `: ${reason}` : ''}`,
        })
        .then(() => {})
        .catch(() => {});

      return jsonResponse({ data: { success: true, review_action: 'disable' } });
    }

    case 'request_info': {
      // Update application
      await sb
        .from('lawyer_applications')
        .update({
          status: 'active_pending_review',
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.profile.email,
        })
        .eq('id', application_id);

      // Update profile if linked
      if (app.user_id) {
        await sb
          .from('profiles')
          .update({
            more_info_requested_at: new Date().toISOString(),
            more_info_requested_by: auth.profile.email,
            admin_note: message || null,
          })
          .eq('id', app.user_id);
      }

      // Send request info email
      sendEmail({
        to: app.email,
        subject: 'Additional Information Needed',
        html: buildRequestInfoEmail(displayName, message),
      }).catch(() => {});

      // Audit
      sb.from('audit_logs')
        .insert({
          entity_type: 'LawyerApplication',
          entity_id: application_id,
          action: 'review_request_info',
          actor_id: auth.profile.id,
          actor_email: auth.profile.email,
          actor_role: 'admin',
          notes: `Requested more info from ${app.email}${message ? `: ${message}` : ''}`,
        })
        .then(() => {})
        .catch(() => {});

      return jsonResponse({ data: { success: true, review_action: 'request_info' } });
    }

    default:
      return errorResponse(`Unknown review_action: ${review_action}. Use 'approve', 'disable', or 'request_info'.`, 400);
  }
}

// ---------------------------------------------------------------------------
// 4. disable
// ---------------------------------------------------------------------------

async function handleDisable(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { user_id, reason } = body;

  if (!user_id) return errorResponse('Missing user_id', 400);

  const sb = createAdminClient();

  // Fetch target
  const { data: target, error: fetchErr } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user_id)
    .single();

  if (fetchErr || !target) return errorResponse('User not found', 404);

  // Update profile
  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      user_status: 'disabled',
      disabled_at: new Date().toISOString(),
      disabled_by: auth.profile.email,
      disabled_reason: reason || null,
    })
    .eq('id', user_id);

  if (updateErr) return errorResponse(updateErr.message, 500);

  // Send disable email (fire-and-forget)
  const displayName = target.full_name || target.email;
  sendEmail({
    to: target.email,
    subject: 'Account Access Update',
    html: buildDisableEmail(displayName, reason),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: user_id,
      action: 'disable_lawyer',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Disabled ${target.email}${reason ? `: ${reason}` : ''}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// 5. reinstate
// ---------------------------------------------------------------------------

async function handleReinstate(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { user_id, reinstate_to_status } = body;

  if (!user_id) return errorResponse('Missing user_id', 400);

  const sb = createAdminClient();

  // Fetch target
  const { data: target, error: fetchErr } = await sb
    .from('profiles')
    .select('id, email, full_name, user_status')
    .eq('id', user_id)
    .single();

  if (fetchErr || !target) return errorResponse('User not found', 404);

  // Verify currently disabled
  if (target.user_status !== 'disabled') {
    return errorResponse(`User is not disabled (current status: ${target.user_status})`, 409);
  }

  const newStatus = reinstate_to_status || 'pending';

  // Update profile
  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      user_status: newStatus,
      disabled_at: null,
      disabled_by: null,
      disabled_reason: null,
      reinstated_at: new Date().toISOString(),
      reinstated_by: auth.profile.email,
    })
    .eq('id', user_id);

  if (updateErr) return errorResponse(updateErr.message, 500);

  // Send reinstatement email (fire-and-forget)
  const displayName = target.full_name || target.email;
  sendEmail({
    to: target.email,
    subject: 'Your Access Has Been Restored',
    html: buildReinstateEmail(displayName),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: user_id,
      action: 'reinstate_lawyer',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Reinstated ${target.email} to status '${newStatus}'`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// 6. reject
// ---------------------------------------------------------------------------

async function handleReject(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { user_id, reason } = body;

  if (!user_id) return errorResponse('Missing user_id', 400);

  const sb = createAdminClient();

  // Fetch target
  const { data: target, error: fetchErr } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user_id)
    .single();

  if (fetchErr || !target) return errorResponse('User not found', 404);

  // Update profile
  const { error: profileErr } = await sb
    .from('profiles')
    .update({
      user_status: 'disabled',
      review_status: 'rejected',
      disabled_at: new Date().toISOString(),
      disabled_by: auth.profile.email,
      disabled_reason: reason || null,
    })
    .eq('id', user_id);

  if (profileErr) return errorResponse(profileErr.message, 500);

  // Update lawyer_profiles to restricted
  await sb
    .from('lawyer_profiles')
    .update({ status: 'restricted' })
    .eq('user_id', user_id);

  // Send rejection email (fire-and-forget)
  const displayName = target.full_name || target.email;
  sendEmail({
    to: target.email,
    subject: 'Update on Your Taylor Made Law Access',
    html: buildRejectionEmail(displayName, reason),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: user_id,
      action: 'reject_lawyer',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Rejected ${target.email}${reason ? `: ${reason}` : ''}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// 7. invite_attorney
// ---------------------------------------------------------------------------

async function handleInviteAttorney(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { email, full_name, firm_name, states_served, practice_areas } = body;

  if (!email) return errorResponse('Missing email', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const sb = createAdminClient();

  // Create or find existing auth user
  let userId: string;

  // Try to find existing user by email
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === normalizedEmail,
  );

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new auth user with a random password (they'll set their own via activation)
    const tempPassword = crypto.randomUUID() + '!Aa1';
    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: false,
    });

    if (createErr || !newUser?.user) {
      return errorResponse(createErr?.message || 'Failed to create user', 500);
    }
    userId = newUser.user.id;
  }

  // Update profile
  const profileUpdate: Record<string, unknown> = {
    user_status: 'invited',
    invited_at: new Date().toISOString(),
    invited_by_admin: auth.profile.email,
  };
  if (full_name) profileUpdate.full_name = full_name;
  if (firm_name) profileUpdate.firm_name = firm_name;
  if (states_served) profileUpdate.states_licensed = states_served;
  if (practice_areas) profileUpdate.practice_areas = practice_areas;

  await sb.from('profiles').update(profileUpdate).eq('id', userId);

  // Create/update lawyer_profiles
  const lpData: Record<string, unknown> = {
    user_id: userId,
    email: normalizedEmail,
    status: 'pending',
  };
  if (full_name) lpData.full_name = full_name;
  if (firm_name) lpData.firm_name = firm_name;
  if (states_served) lpData.states_licensed = states_served;
  if (practice_areas) lpData.practice_areas = practice_areas;
  lpData.created_by = auth.profile.email;

  await sb.from('lawyer_profiles').upsert(lpData, { onConflict: 'user_id' });

  // Generate activation link (use Supabase magic link or custom token)
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
  });

  // Build activation URL
  let activationUrl = `${APP_URL}/Activate`;
  if (linkData?.properties?.hashed_token) {
    activationUrl = `${APP_URL}/Activate?token=${linkData.properties.hashed_token}`;
  } else if (!linkErr) {
    // Fallback: use the action_link if available
    const actionLink = (linkData as Record<string, unknown>)?.properties?.action_link;
    if (typeof actionLink === 'string') {
      activationUrl = actionLink;
    }
  }

  // Send invitation email (fire-and-forget)
  const displayName = full_name || normalizedEmail;
  sendEmail({
    to: normalizedEmail,
    subject: "You're Invited to Join Taylor Made Law",
    html: buildInviteEmail(displayName, activationUrl),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: userId,
      action: 'invite_attorney',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Invited attorney ${normalizedEmail}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true, user_id: userId } });
}

// ---------------------------------------------------------------------------
// 8. invite_admin
// ---------------------------------------------------------------------------

async function handleInviteAdmin(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { auth } = admin;
  const body = await req.json().catch(() => ({}));
  const { email } = body;

  if (!email) return errorResponse('Missing email', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const sb = createAdminClient();

  // Create auth user
  const tempPassword = crypto.randomUUID() + '!Aa1';
  const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: false,
  });

  if (createErr || !newUser?.user) {
    return errorResponse(createErr?.message || 'Failed to create admin user', 500);
  }

  const userId = newUser.user.id;

  // Update profile to admin role
  await sb
    .from('profiles')
    .update({
      role: 'admin',
      user_status: 'approved',
      invited_at: new Date().toISOString(),
      invited_by_admin: auth.profile.email,
    })
    .eq('id', userId);

  // Generate invite link
  const { data: linkData } = await sb.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
  });

  let inviteUrl = `${APP_URL}/AdminLogin`;
  if (linkData?.properties?.hashed_token) {
    inviteUrl = `${APP_URL}/SetPassword?token=${linkData.properties.hashed_token}`;
  }

  // Send admin invite email (fire-and-forget)
  sendEmail({
    to: normalizedEmail,
    subject: "You're Invited to Join Taylor Made Law (Admin)",
    html: buildAdminInviteEmail(normalizedEmail, inviteUrl),
  }).catch(() => {});

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: userId,
      action: 'invite_admin',
      actor_id: auth.profile.id,
      actor_email: auth.profile.email,
      actor_role: 'admin',
      notes: `Invited admin user ${normalizedEmail}`,
    })
    .then(() => {})
    .catch(() => {});

  return jsonResponse({ data: { success: true, user_id: userId } });
}

// ---------------------------------------------------------------------------
// 9. generate_report
// ---------------------------------------------------------------------------

async function handleGenerateReport(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const sb = createAdminClient();

  // Fetch all profiles with role = 'user'
  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (pErr) return errorResponse(pErr.message, 500);

  // Fetch all lawyer_profiles
  const { data: lawyerProfiles, error: lpErr } = await sb
    .from('lawyer_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (lpErr) return errorResponse(lpErr.message, 500);

  // Build a map of lawyer_profiles by user_id
  const lpMap = new Map<string, Record<string, unknown>>();
  for (const lp of lawyerProfiles || []) {
    lpMap.set(lp.user_id, lp);
  }

  // Merge profiles with lawyer_profiles
  const report = (profiles || []).map((p) => {
    const lp = lpMap.get(p.id);
    return {
      // Core identity
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      firm_name: p.firm_name,
      bar_number: p.bar_number,
      states_licensed: p.states_licensed,
      practice_areas: p.practice_areas,
      years_experience: p.years_experience,

      // Status
      user_status: p.user_status,
      membership_status: p.membership_status,
      subscription_status: p.subscription_status,
      lawyer_profile_status: lp?.status || null,

      // Billing
      stripe_customer_id: p.stripe_customer_id,
      free_trial_months: p.free_trial_months,
      trial_ends_at: p.trial_ends_at,

      // Timestamps
      created_at: p.created_at,
      approved_at: p.approved_at,
      approved_by: p.approved_by,
      disabled_at: p.disabled_at,
      account_activated_at: p.account_activated_at,
      profile_completed_at: p.profile_completed_at,

      // Lawyer profile extras
      lp_subscription_status: lp?.subscription_status || null,
      lp_stripe_subscription_id: lp?.stripe_subscription_id || null,
      profile_completed: lp?.profile_completed || false,
      referral_agreement_accepted: lp?.referral_agreement_accepted || p.referral_agreement_accepted || false,
    };
  });

  return jsonResponse({ data: report });
}

// ---------------------------------------------------------------------------
// Email template builders
// ---------------------------------------------------------------------------

function buildApprovalEmail(name: string): string {
  const body = `
    ${tmlH1("You're Approved \u2014 Cases Are Now Unlocked")}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP('Great news! Your Taylor Made Law account has been approved. You now have full access to the case exchange, legal circles, and all network features.')}
    ${tmlP('Log in to your dashboard to start browsing and accepting cases today.')}
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(`${APP_URL}/LawyerDashboard`, 'Go to Dashboard')}
    </div>
    ${tmlP('Welcome to the network!')}
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildRejectionEmail(name: string, reason?: string): string {
  const reasonBlock = reason
    ? tmlP(`<strong>Details:</strong> ${escapeHtml(reason)}`)
    : '';

  const body = `
    ${tmlH1('Update on Your Taylor Made Law Access')}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP('After careful review, we are unable to approve your access to the Taylor Made Law network at this time.')}
    ${reasonBlock}
    ${tmlP('If you believe this was made in error or have questions, please reach out to our support team.')}
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildDisableEmail(name: string, reason?: string): string {
  const reasonBlock = reason
    ? tmlP(`<strong>Reason:</strong> ${escapeHtml(reason)}`)
    : '';

  const body = `
    ${tmlH1('Account Access Update')}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP('Your Taylor Made Law account access has been temporarily suspended.')}
    ${reasonBlock}
    ${tmlP('If you have questions about this change, please contact our support team for assistance.')}
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildReinstateEmail(name: string): string {
  const body = `
    ${tmlH1('Your Access Has Been Restored')}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP('Good news! Your Taylor Made Law account access has been restored. You can now log in and continue using all network features.')}
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(`${APP_URL}/LawyerDashboard`, 'Go to Dashboard')}
    </div>
    ${tmlP('Welcome back!')}
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildInviteEmail(name: string, activationUrl: string): string {
  const body = `
    ${tmlH1("You're Invited to Join Taylor Made Law")}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP("You've been invited to join the Taylor Made Law attorney referral network. Our platform connects attorneys for case exchange, collaboration, and professional growth.")}
    <div style="background:#faf8f5;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-weight:600;color:#111827;font-size:14px;">What you get access to:</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">&#x2022; Case exchange marketplace</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">&#x2022; Legal circles for collaboration</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">&#x2022; Direct messaging with other attorneys</p>
      <p style="margin:4px 0;color:#6b7280;font-size:14px;">&#x2022; Exclusive resources and content</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(activationUrl, 'Accept Invitation & Set Up Account')}
    </div>
    ${tmlP('<span style="color:#9ca3af;font-size:12px;">This invitation expires in 7 days.</span>')}
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildAdminInviteEmail(email: string, inviteUrl: string): string {
  const body = `
    ${tmlH1("You're Invited to Join Taylor Made Law (Admin)")}
    ${tmlP(`Hi ${escapeHtml(email)},`)}
    ${tmlP("You've been invited to join the Taylor Made Law admin team. Click the button below to set your password and get started.")}
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(inviteUrl, 'Set Up Your Admin Account')}
    </div>
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
}

function buildRequestInfoEmail(name: string, message?: string): string {
  const messageBlock = message
    ? `<div style="background:#f9fafb;border-left:4px solid #3a164d;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;color:#374151;font-size:14px;">${escapeHtml(message)}</p>
      </div>`
    : '';

  const body = `
    ${tmlH1('Additional Information Needed')}
    ${tmlP(`Hi ${escapeHtml(name)},`)}
    ${tmlP('Thank you for your interest in the Taylor Made Law network. We need a bit more information before we can finalize your application.')}
    ${messageBlock}
    ${tmlP('Please log in to your account to update your information, or reply to this email with the requested details.')}
    <div style="text-align:center;margin:24px 0;">
      ${tmlButton(`${APP_URL}/LawyerDashboard`, 'Update Your Profile')}
    </div>
    ${tmlP('&mdash; The Taylor Made Law Team')}
  `;
  return tmlEmailWrapper(body);
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
      case 'approve_lawyer': return await handleApproveLawyer(req);
      case 'approve_application': return await handleApproveApplication(req);
      case 'review_application': return await handleReviewApplication(req);
      case 'disable': return await handleDisable(req);
      case 'reinstate': return await handleReinstate(req);
      case 'reject': return await handleReject(req);
      case 'invite_attorney': return await handleInviteAttorney(req);
      case 'invite_admin': return await handleInviteAdmin(req);
      case 'generate_report': return await handleGenerateReport(req);
      default: return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('admin-lawyers function error:', err);
    return errorResponse(err.message || 'Internal error', 500);
  }
});
